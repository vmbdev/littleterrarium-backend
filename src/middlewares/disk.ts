/**
 * Get the files uploaded through multer and handles them.
 * At the moment, it hashes the file, creates a folder with it and moves
 * the file there. Then, it creates req.disk for the next middleware to know.
 */

import { RequestHandler, Request, Response, NextFunction } from 'express';

import { LTRes } from '../helpers/ltres.js';
import FileSystem, { LocalFile } from '../helpers/filesystem.js';

declare global {
  namespace Express {
    type Disk = {
      file?: LocalFile;
      files?: LocalFile[];
    };

    interface Request {
      disk: Disk;
    }
  }
}

type DiskOptions = {
  protocol?: string;
  host?: string;
  destiny?: string;
};

export const generateDisk: RequestHandler = (req, _res, next) => {
  req.disk = {};

  next();
};

const processFile = async (file: Express.Multer.File, options: DiskOptions) => {
  const diskFile: LocalFile = await FileSystem.saveFile(
    file.path,
    options.destiny
  );

  diskFile.fieldname = file.fieldname;
  diskFile.mimetype = file.mimetype;
  diskFile.size = file.size;

  return diskFile;
};

export const image = (directory?: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.file) {
      try {
        req.disk.file = await processFile(req.file, {
          destiny: directory
            ? `user/${req.auth.userId}/${directory}/`
            : undefined,
        });
      } catch (err: any) {
        if (err.error && err.error === 'IMG_NOT_VALID') {
          return next(LTRes.msg('IMG_NOT_VALID'));
        } else return next(LTRes.createCode(500));
      }
    }

    next();
  };
};

export const gallery = (directory?: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.files) {
      req.disk.files = [];

      for (const file in req.files) {
        try {
          const diskFile = await processFile((req.files as any)[file], {
            destiny: directory
              ? `user/${req.auth.userId}/${directory}/`
              : undefined,
          });

          req.disk.files.push(diskFile);
        } catch (err: any) {
          if (err.error && err.error === 'IMG_NOT_VALID') {
            return next(LTRes.msg('IMG_NOT_VALID'));
          } else return next(LTRes.createCode(500));
        }
      }
    }
    next();
  };
};

export default {
  image,
  gallery,
};
