/**
 * Get the files uploaded through multer and handles them.
 * At the moment, it hashes the file, creates a folder with it and moves
 * the file there. Then, it creates req.disk for the next middleware to know.
 */

import { RequestHandler, Request, Response, NextFunction } from 'express';
import FileSystem, { LocalFile } from '../helpers/filesystem';

declare global {
  namespace Express {
    type Disk = {
      file?: any,
      files?: any[]
    }

    interface Request {
      disk: Disk,
    }
  }
}

export const generateDisk: RequestHandler = (req, res, next) => {
  req.disk = {};

  next();
}

const processFile = async (file: Express.Multer.File, protocol?: string, host?: string) => {
  const diskFile: LocalFile = await FileSystem.saveFile(file.path);
  diskFile.fieldname = file.fieldname;
  diskFile.mimetype = file.mimetype;
  diskFile.size = file.size;

  diskFile.url = {
    full: `${protocol}://${host}/${diskFile.path.full}`,
    mid: `${protocol}://${host}/${diskFile.path.mid}`,
    thumb: `${protocol}://${host}/${diskFile.path.thumb}`
  }

  return diskFile;
}

export const image = async (req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    try {
      req.disk.file = await processFile(req.file, req.protocol, req.get('host'));
    } catch (err: any) {
      if (err.error && (err.error === 'IMG_NOT_VALID')) return next({ error: err.error });
      else return next({ code: 500 });
    }
  }

  next();
}

export const gallery = async (req: Request, res: Response, next: NextFunction) => {
  if (req.files) {
    req.disk.files = [];

    for (const file in req.files) {
      try {
        const diskFile = await processFile((req.files as any)[file], req.protocol, req.get('host'));
        req.disk.files.push(diskFile);
      } catch (err: any) {
        if (err.error && (err.error === 'IMG_NOT_VALID')) return next({ error: err.error });
        else return next({ code: 500 });
      }
    }
  }

  next();
}

export default {
  image,
  gallery
};