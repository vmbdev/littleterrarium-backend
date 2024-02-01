import { RequestHandler } from 'express';
import dayjs from 'dayjs';
import prisma from '../prismainstance.js';

const find: RequestHandler = async (req, res, next) => {
  const tasks = await prisma.plant.findMany({
    where: {
      OR: [
        { waterNext: { lte: new Date() } },
        { fertNext: { lte: new Date() } },
      ],
      ownerId: req.auth.userId,
    },
    select: {
      id: true,
      customName: true,
      waterNext: true,
      fertNext: true,
      cover: {
        select: {
          images: true,
        },
      },
      specie: {
        select: {
          name: true,
          commonName: true,
        },
      },
      // in case the cover doesn't exists, we get one photo to represent
      photos: {
        take: -1,
        select: {
          images: true,
        },
      },
    },
  });

  // not sold on this, yet I think it's better than querying the db twice
  const list = tasks.map((i) => {
    if (dayjs(i.waterNext).isAfter(dayjs())) i.waterNext = null;
    if (dayjs(i.fertNext).isAfter(dayjs())) i.fertNext = null;

    return i;
  });

  res.send(list);
};

export default {
  find,
};
