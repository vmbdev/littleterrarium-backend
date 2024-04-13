import { Plant, Prisma } from '@prisma/client';
import dayjs from 'dayjs';

import prisma from '../prismainstance';
import { removePhoto } from '../helpers/photomanager';

export const plantExtension = Prisma.defineExtension({
  name: 'plant',
  model: {
    plant: {
      async ltCreate(data: Prisma.PlantUncheckedCreateInput): Promise<Plant> {
        if (!data.customName && data.specieId) {
          const specie = await prisma.specie.findUnique({
            where: { id: data.specieId },
          });

          data.sortName = specie?.name;
        }

        // if water/fertiliser frequencies and last times are given,
        // calculate the next time it must be done
        if (data.waterFreq && data.waterLast && dayjs(data.waterLast).isValid()) {
          data.waterNext = nextDate(data.waterLast, data.waterFreq);
        }
        if (data.fertFreq && data.fertLast && dayjs(data.fertLast).isValid()) {
          data.fertNext = nextDate(data.fertLast, data.fertFreq);
        }

        return await prisma.plant.create({ data });
      },

      async ltUpdate(
        data: Prisma.PlantUncheckedUpdateInput,
        id: number,
        userId: number
      ): Promise<Plant> {
        let plant = await prisma.plant.update({
          where: {
            id,
            ownerId: userId,
          },
          include: {
            cover: true,
            specie: true,
          },
          data,
        });

        const plantUpdatedData: any = {};

        /**
         * We define here the internal property sortName.
         * It's used exclusively internally to sort the plants.
         * The requirement for this is because the plant can be named by the user
         * (customName) or by the specie (specie.name), and we can't sort it by
         * both columns simultaneously (just by one and then another).
         */
        if (!plant.customName) {
          if (plant.specieId) {
            const specie = await prisma.specie.findUnique({
              where: { id: plant.specieId },
            });

            plantUpdatedData.sortName = specie?.name;
          } else plantUpdatedData.sortName = null;
        }

        /**
         * Check if the object has both frequency and last time for both water and
         * fertlizer. If so, updates the waterNext/waterFreq property.
         * This is tricky, as it requires an update from the object that has been
         * just updated, but it's needed as only one property may have been updated
         * and thus received by the user (i.e. waterFreq but no waterLast).
         * In an environment with a specied database that supports both triggers
         * and date operations, it can be done with such trigger.
         * */
        if (plant.waterFreq && plant.waterLast) {
          plantUpdatedData.waterNext = nextDate(
            plant.waterLast,
            plant.waterFreq
          );
        } else plantUpdatedData.waterNext = null;

        if (plant.fertFreq && plant.fertLast) {
          plantUpdatedData.fertNext = nextDate(plant.fertLast, plant.fertFreq);
        } else plantUpdatedData.fertNext = null;

        if (Object.keys(plantUpdatedData).length > 0) {
          plant = await prisma.plant.update({
            where: {
              id,
              ownerId: userId,
            },
            include: {
              cover: true,
              specie: true,
            },
            data: plantUpdatedData,
          });
        }

        return plant;
      },

      async ltRemove(ids: number[], userId: number): Promise<number> {
        const proms = [];
        // we need the photos to update their hash, so we can't use deleteMany
        for (const id of ids) {
          proms.push(
            prisma.plant.delete({
              where: {
                id,
                ownerId: userId,
              },
              include: { photos: true },
            })
          );
        }

        const plants = (await Promise.allSettled(proms)).reduce(
          (res: any[], prom) => {
            if (prom.status === 'fulfilled') res.push(prom.value);
            return res;
          },
          []
        );

        // update references of the hashes of the photos
        for (const plant of plants) {
          for (const photo of plant.photos) {
            await removePhoto(photo.id, userId);
          }
        }

        return plants.length;
      },

      async getCoverId(id: number) {
        const plant = await prisma.plant.findUnique({
          select: { coverId: true, ownerId: true, public: true },
          where: { id },
        });

        return plant;
      },
    },
  },
});

export const nextDate = (last: Date | string, freq: number): Date => {
  return dayjs(last).add(freq, 'days').toDate();
};
