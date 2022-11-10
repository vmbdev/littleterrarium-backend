import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';

const defaultMessages: { [key: number]: string } = {
  401: 'UNAUTHENTICATED',
  403: 'UNAUTHORISED',
  500: 'SERVER_ERROR',
}

// TODO: remove req.files on temp
// TODO: manage non api errors
const errorHandling: ErrorRequestHandler = (err, req, res, next) => {
  const errorMsg = err.error ? err.error : defaultMessages[err.code];
  const data = (err.data && Object.keys(err.data).length > 0) ? err.data : undefined
  const code = err.code ? err.code : 400;

  res.status(code).send({
    msg: errorMsg,
    data
  });
}

export default errorHandling;