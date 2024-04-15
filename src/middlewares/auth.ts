import { type RequestHandler, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js';

import prisma from '../prisma.js';
import { LTRes } from '../helpers/ltres.js';
import { stringQueryToNumbers } from '../helpers/dataparser.js';

declare global {
  namespace Express {
    type Auth = {
      userId?: number;
    };

    interface Request {
      auth: Auth;
    }
  }
}

export const generateAuth: RequestHandler = (req, res, next) => {
  // this object made much more sense before, but we're keeping it up for
  // compatibility
  req.auth = {
    userId: req.session.userId,
  };

  next();
};

// only allow if it's signed in, and if the destined userId is the owner or if
// user's an admin
export const self: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn) return next(LTRes.createCode(401));
  const userId = +req.params.userId ?? +req.body.userId;

  if (userId && userId !== req.auth.userId && req.session.role !== Role.ADMIN) {
    return next(LTRes.createCode(403));
  }

  next();
};

export const admin: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn || req.session.role !== Role.ADMIN) {
    return next(LTRes.createCode(403));
  }

  next();
};

export const signedIn: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn) return next(LTRes.createCode(403));

  next();
};

/**
 * Given a model name, returns the respective prisma delegate.
 * I really hate this, as it's extremely unscalable, but it works until
 * I find a workaround for TypeScript.
 * @param {string} model - The name of the model.
 * @returns {any} - The delegate object for the model.
 */
export const getModelDelegate = (model: string): any => {
  let prismaDelegate;

  switch (model) {
    case 'user':
      prismaDelegate = prisma.user;
      break;
    case 'location':
      prismaDelegate = prisma.location;
      break;
    case 'plant':
      prismaDelegate = prisma.plant;
      break;
    case 'photo':
      prismaDelegate = prisma.photo;
      break;
    case 'specie':
      prismaDelegate = prisma.specie;
      break;
    case 'notification':
      prismaDelegate = prisma.notification;
      break;
  }

  return prismaDelegate;
};

/**
 * Checks if the related object is owned by the same user.
 * This prevents an user creating something like a plant in a location not owned.
 * @param {string} model - The model to be looked up
 * @param {string} idField - The name of the ID field in the database (usually 'id')
 * @returns {Function} - Express Middleware
 */
export const checkRelationship = (model: string, idField: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let id;
    const prismaDelegate = getModelDelegate(model);

    if (
      req.method === 'PATCH' ||
      (req.method === 'POST' && req.body[idField])
    ) {
      id = +req.body[idField];
    } else if (req.params[idField]) id = +req.params[idField];

    if (prismaDelegate && id) {
      try {
        await prismaDelegate.findFirstOrThrow({
          where: {
            id,
            ownerId: req.auth.userId,
          },
        });
      } catch (err) {
        return next(LTRes.createCode(403));
      }
    }

    next();
  };
};

/**
 * Checks if the user owns the item before updating it
 * @param {string} model
 * @param {boolean} mass Whether it's receiving multiple ids in a string
 * @returns {function} - Express Middleware
 */
export const checkOwnership = (model: string, mass: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let ids;
    const prismaDelegate = getModelDelegate(model);

    if (mass) {
      ids = stringQueryToNumbers(req.params.id);
    } else if (
      req.method === 'PATCH' ||
      (req.method === 'POST' && req.body.id)
    ) {
      ids = [+req.body.id];
    } else ids = [+req.params.id];

    if (prismaDelegate && ids) {
      try {
        for (const id of ids) {
          const el = await prismaDelegate.findFirstOrThrow({ where: { id } });

          // item exists but is not owned by the requesting user
          if (el.ownerId && el.ownerId !== req.auth.userId) {
            return next(LTRes.createCode(403));
          }
        }
      } catch (err: unknown) {
        if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          // if the item isn't found then it's some other controller problem,
          // we call next anyway
          return next();
        } else return next(LTRes.createCode(500));
      }
    }

    next();
  };
};

export default {
  self,
  admin,
  signedIn,
  checkRelationship,
  checkOwnership,
};
