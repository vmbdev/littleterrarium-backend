import { Request, Response, NextFunction, RequestHandler } from 'express';
import { LTRes } from '../helpers/ltres';

export interface ParserParameters {
  [key: string]: any
}

export interface ParserOptions {
  [key: string]: boolean
}

declare global {
  namespace Express {
    interface Request {
      parser: ParserParameters
    }
  }
}

export const generateParser: RequestHandler = (req, res, next) => {
  req.parser = {};

  next();
}

// TODO: define body/params/query implicitly
export const integers = (list: ParserOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field in list) {
      const place = (
        req.body[field] ? req.body
        : req.params[field] ? req.params
        : null
      );
      if (place) {
        // avoid mutating params or body
        req.parser[field] = Number.parseInt(place[field]);
        if (!req.parser[field]) {
          return next(LTRes.msg('INVALID_VALUE').errorField(field));
        }
      }
      else if (list[field]) {
        return next(LTRes.msg('MISSING_VALUE').errorField(field));
      }
    }

    next();
  }
}

export default {
  generateParser,
  integers,
}