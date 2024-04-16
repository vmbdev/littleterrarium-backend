import { RequestHandler } from 'express';

import prisma from '../prisma.js';

const find: RequestHandler = async (req, res, _next) => {
  // FIXME: !
  const list = await prisma.plant.taskList(req.auth.userId!);

  res.send(list);
};

export default {
  find,
};
