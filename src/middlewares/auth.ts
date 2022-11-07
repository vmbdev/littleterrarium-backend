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

  return next();
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
 * Checks if the related object is owned by the same user.
 * This prevents an user creating something like a plant in a location not owned.
 * @param {string} model - The model to be looked up
 * @param {string} idField - The name of the ID field in the database (usually 'id')
 * @returns {function} - Express Middleware
 */
export const checkRelationship = (model: string, idField: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let id;

    if ((req.method === 'PUT') || (req.method === 'POST') && req.body[idField]) id = +req.body[idField];
    else id = +req.params[idField];

    // TODO: fix model detection
    // if (prisma[model] && id) {
    //   try {
    //     await prisma[model].findFirstOrThrow({
    //       where: {
    //         id,
    //         ownerId: req.auth.userId
    //       }
    //     });
    //   } catch (err) {
    //     return next({ code: 403 });
    //   }
    // }

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

    if ((req.method === 'PUT') || (req.method === 'POST') && req.body.id) id = +req.body.id;
    else id = +req.params.id;

    // TODO: fix model detection
    // if (prisma[model] && id) {
    //   try {
    //     await prisma[model].findFirstOrThrow({
    //       where: {
    //         id,
    //         ownerId: req.auth.userId
    //       }
    //     });
    //   } catch (err) {
    //     return next({ code: 403 });
    //   }
    // }

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