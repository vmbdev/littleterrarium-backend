import { Hash, Photo, Prisma, PrismaPromise } from '@prisma/client';

import prisma from '../prisma.js';
import { NavigationData } from '../helpers/ltres.js';
import filesystem, { LocalFile } from '../helpers/filesystem.js';

export const PhotoColumnSelection: Prisma.PhotoSelect = {
  id: true,
  images: true,
  description: true,
  public: true,
  ownerId: true,
  plantId: true,
  takenAt: true,
};

export const photoService = Prisma.defineExtension({
  name: 'photo',
  model: {
    photo: {
      ltCreate(data: any, file: LocalFile): PrismaPromise<Hash> {
        const photoData = {
          ...data,
          images: { path: file.path, webp: file.webp ? file.webp : undefined },
        };

        // on both update or insert, we always create an entry in Photos
        return prisma.hash.upsert({
          where: { hash: file.hash },
          update: {
            references: { increment: 1 },
            photos: { create: photoData },
          },
          create: {
            hash: file.hash,
            photos: { create: photoData },
          },
        });
      },

      async ltRemove(id: number, userId?: number): Promise<Photo> {
        const photo = await prisma.photo.delete({ where: { id, ownerId: userId } });

        // no need to check for ownerId as we checked above
        // yeah, we update the reference and then we check if it's zero to
        // delete it's still possibly fewer operations than check and
        // update/check and delete
        const { references } = await prisma.hash.update({
          where: { id: photo.hashId },
          data: { references: { decrement: 1 } },
        });

        // if no references left, we remove the Hash entry and the files
        if (references === 0) {
          await prisma.hash.delete({ where: { id: photo.hashId } });

          const images: any = photo.images;

          if (images) {
            let files: any[] = [...Object.values(images.path)];

            if (images.webp) files = [...files, ...Object.values(images.webp)];

            for (const file of files) {
              await filesystem.removeFile(file);
            }
          }
        }

        return photo;
      },

      async getNavigation(id: number, userId: number): Promise<NavigationData | null> {
        const currentPhoto = await prisma.photo.findUnique({
          select: { plantId: true, ownerId: true, takenAt: true },
          where: { id },
        });
        
        if (currentPhoto) {
          const requireBeingPublic =
            currentPhoto.ownerId !== userId ? true : undefined;
          const query: Prisma.PhotoFindFirstArgs = {
            select: { id: true },
            take: 1,
            skip: 1,
            cursor: {
              id,
            },
            where: {
              plantId: currentPhoto.plantId,
              public: requireBeingPublic,
            },
          };

          const [nextPhoto, prevPhoto] = await Promise.allSettled([
            prisma.photo.findFirst({
              ...query,
              orderBy: [{ takenAt: 'desc' }, { id: 'desc' }],
            }),
            prisma.photo.findFirst({
              ...query,
              orderBy: [{ takenAt: 'asc' }, { id: 'asc' }],
            }),
          ]);

          const navigation: NavigationData = {
            prev:
              prevPhoto.status === 'fulfilled' && prevPhoto.value
                ? prevPhoto.value
                : undefined,
            next:
              nextPhoto.status === 'fulfilled' && nextPhoto.value
                ? nextPhoto.value
                : undefined,
          };

          return navigation;
        } else return null;
      }
    },
  },
});
