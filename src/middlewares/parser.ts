import { Request, Response, NextFunction, RequestHandler } from 'express';

import { LTRes } from '../helpers/ltres.js';
import { stringQueryToNumbers } from '../helpers/dataparser.js';

export interface ParserParameters {
  [key: string]: any;
}

export type ParserObjects = 'body' | 'query' | 'params';

export interface ParserOptions {
  [key: string]: boolean;
}

declare global {
  namespace Express {
    interface Request {
      parser: ParserParameters;
    }
  }
}

export const generateParser: RequestHandler = (req, res, next) => {
  req.parser = {};

  next();
};

export const number = (list: ParserOptions, object: ParserObjects = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field in list) {
      let place;

      if (object === 'body') place = req.body;
      else if (object === 'params') place = req.params;
      else place = req.query;

      if (place) {
        // avoid mutating params or body
        req.parser[field] = +place[field];

        if (!req.parser[field]) {
          // if it isn't mandatory we just null it
          if (!list[field]) req.parser[field] = null;
          else {
            return next(LTRes.msg('INVALID_VALUE').errorField(field));
          }
        }
      } else if (list[field]) {
        return next(LTRes.msg('MISSING_VALUE').errorField(field));
      }
    }

    next();
  };
};

export const numbers = (list: ParserOptions, object: ParserObjects = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field in list) {
      let place;

      if (object === 'body') place = req.body;
      else if (object === 'params') place = req.params;
      else place = req.query;

      if (place) {
        // avoid mutating params or body
        req.parser[field] = stringQueryToNumbers(place[field]);

        if (!req.parser[field]) {
          if (!list[field]) req.parser[field] = null;
          else {
            return next(LTRes.msg('INVALID_VALUE').errorField(field));
          }
        }
      } else if (list[field]) {
        return next(LTRes.msg('MISSING_VALUE').errorField(field));
      }
    }

    next();
  };
};

export default {
  generateParser,
  number,
  numbers,
};
