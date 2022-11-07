import { Request, Response, NextFunction, RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      parser: any
    }
  }
}

export const generateParser: RequestHandler = (req, res, next) => {
  req.parser = {};

  next();
}

// TODO: define body/params/query implicitly
export const integers = (list: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field in list) {
      let place = (
        req.body[field] ? req.body
        : req.params[field] ? req.params
        : null
      );
      if (place) {
        // avoid mutating params or body
        req.parser[field] = Number.parseInt(place[field]);
        if (!req.parser[field]) return next({ error: 'INVALID_VALUE', data: { field } })
      }
      else if (list[field]) return next({ error: 'MISSING_VALUE', data: { field } });
    }

    next();
  }
}

export default {
  generateParser,
  integers,
}