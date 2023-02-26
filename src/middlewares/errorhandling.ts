import { ErrorRequestHandler } from 'express';
import { LTRes } from '../helpers/ltres';
import filesystem from '../helpers/filesystem';

const defaultMessages: { [key: number]: string } = {
  401: 'UNAUTHENTICATED',
  403: 'UNAUTHORISED',
  500: 'SERVER_ERROR',
}

const errorHandling: ErrorRequestHandler = async (err, req, res, next) => {
  // remove temporary files that didn't get processed
  if (req.file) filesystem.removeFile(req.file.path);
  else if (req.files) {
    for (const file in req.files) {
      await filesystem.removeFile((req.files as any)[file].path);
    }
  }

  if (err instanceof LTRes) {
    const error: LTRes = err;
    let code: number;

    if (error.code) {
      code = error.code;
      delete error.code;
      
      if (!error.msg) error.msg = defaultMessages[code];
    }
    else code = 400;

    res.status(code).send(error);
  }

  else res.status(500).send();
}

export default errorHandling;