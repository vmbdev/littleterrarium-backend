import { Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
import { Role } from '@prisma/client';
import prisma from '../prismainstance';

declare global {
  namespace Express {
    type Auth = {
      userId?: number
    }

    interface Request {
      auth: Auth
    }
  }
}

export const generateAuth: RequestHandler = (req, res, next) => {
  req.auth = {};
  req.auth.userId = (
    req.body.userId ? +req.body.userId
    : req.params.userId ? +req.params.userId
    : req.session.userId
  );

  next();
}

// only allow if it's signed in, and if the data modifying is his/her or if he/she's an admin
export const self: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn) return next({ code: 401 });
  else if ((req.auth.userId !== req.session.userId) && (req.session.role !== Role.ADMIN)) {
    return next({ code: 403 });
  }

  next();
}

export const admin: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn || (req.session.role !== Role.ADMIN)) return next({ code: 403 });

  next();
}

export const signedIn: RequestHandler = (req, res, next) => {
  if (!req.session.signedIn) return next({ code: 403 });

  next();
}


/**
 * Given a model name, returns the respective prisma delegate.
 * I really hate this, as it's extremely unscalable, but it works until
 * I find a workaround for TypeScript. 
 * @param {string} model - The name of the model.
 * @returns {any} - The delegate object for the model.
 */
export const getModelDelegate = (model: string): any => {
  let prismaDelegate;

  switch(model) {
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
}


/**
 * Checks if the related object is owned by the same user.
 * This prevents an user creating something like a plant in a location not owned.
 * @param {string} model - The model to be looked up
 * @param {string} idField - The name of the ID field in the database (usually 'id')
 * @returns {function} - Express Middleware
 */
export const checkRelationship = (model: string, idField: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let id;
    const prismaDelegate = getModelDelegate(model);

    if ((req.method === 'PUT') || (req.method === 'POST') && req.body[idField]) id = +req.body[idField];
    else id = +req.params[idField];

    if (prismaDelegate && id) {
      try {
        await prismaDelegate.findFirstOrThrow({
          where: {
            id,
            ownerId: req.auth.userId
          }
        });
      } catch (err) {
        return next({ code: 403 });
      }
    }

    next();
  }
}

/**
 * Checks if the user owns the item before updating it
 * @param {string} model 
 * @returns {function} - Express Middleware
 */
export const checkOwnership = (model: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let id;
    const prismaDelegate = getModelDelegate(model);

    if ((req.method === 'PUT') || (req.method === 'POST') && req.body.id) id = +req.body.id;
    else id = +req.params.id;

    if (prismaDelegate && id) {
      try {
        await prismaDelegate.findFirstOrThrow({
          where: {
            id,
            ownerId: req.auth.userId
          }
        });
      } catch (err) {
        return next({ code: 403 });
      }
    }

    next();
  }
}

export default {
  self,
  admin,
  signedIn,
  checkRelationship,
  checkOwnership
};