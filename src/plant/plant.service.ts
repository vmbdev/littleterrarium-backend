import { Plant, Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';

import prisma from '../prisma';
import { nextDate, prepareForSortName } from '../helpers/dataparser';
import { plants as plantsConfig } from '../config/littleterrarium.config.js';

export interface PlantCover {
  coverId: number | null;
  ownerId: number;
  public: boolean;
}

export interface PlantFindOptions {
  filter?: string;
  limit?: number;
  cursor?: number;
  sort?: SortColumn;
  order?: SortOrder;
}

export type SortColumn = 'name' | 'date';
export type SortOrder = 'asc' | 'desc';

export const plantService = Prisma.defineExtension({
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
        if (
          data.waterFreq &&
          data.waterLast &&
          dayjs(data.waterLast).isValid()
        ) {
          data.waterNext = nextDate(data.waterLast, data.waterFreq);
        }
        if (data.fertFreq && data.fertLast && dayjs(data.fertLast).isValid()) {
          data.fertNext = nextDate(data.fertLast, data.fertFreq);
        }

        return prisma.plant.create({ data });
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
            await prisma.photo.ltRemove(photo.id, userId);
          }
        }

        return plants.length;
      },

      ltFindMany(
        query: Prisma.PlantFindManyArgs<DefaultArgs>,
        options: PlantFindOptions
      ): Promise<Plant[]> {
        if (options.filter) {
          query.where = {
            ...query.where,
            sortName: {
              contains: prepareForSortName(options.filter as string),
            },
          };
        }

        if (options.limit && options.limit > 0) {
          query.take = options.limit;
        } else query.take = plantsConfig.number;

        if (options.cursor) {
          query.cursor = { id: options.cursor };
          query.skip = 1;
        }

        if (options.sort) {
          let order: 'asc' | 'desc' = 'asc';

          if (options.order && options.order === 'desc') order = 'desc';

          if (options.sort === 'name') query.orderBy = [{ sortName: order }];
          else if (options.sort === 'date') {
            query.orderBy = [{ createdAt: order }];
          }
        }

        return prisma.plant.findMany(query);
      },

      getCoverId(id: number): Promise<PlantCover | null> {
        return prisma.plant.findUnique({
          select: { coverId: true, ownerId: true, public: true },
          where: { id },
        });
      },
    },
  },
});
