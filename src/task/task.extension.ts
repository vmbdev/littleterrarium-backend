import { Plant, Prisma } from '@prisma/client';
import dayjs from 'dayjs';

import prisma from '../prisma';

export const taskExtension = Prisma.defineExtension({
  name: 'task',
  model: {
    plant: {
      async taskList(userId: number): Promise<Plant[]> {
        const tasks = await prisma.plant.findMany({
          where: {
            OR: [
              { waterNext: { lte: new Date() } },
              { fertNext: { lte: new Date() } },
            ],
            ownerId: userId,
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
        // FIXME: any
        const list: any = tasks.map((i) => {
          if (dayjs(i.waterNext).isAfter(dayjs())) i.waterNext = null;
          if (dayjs(i.fertNext).isAfter(dayjs())) i.fertNext = null;
      
          return i;
        });

        return list;
      }
    }
  }
});
