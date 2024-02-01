/**
 * Helper class for the models requiring photos (Plant, User, Location)
 */

import { Prisma } from '@prisma/client';
import prisma from '../prismainstance.js';
import filesystem, { LocalFile } from './filesystem.js';

export const PhotoColumnSelection: Prisma.PhotoSelect = {
  id: true,
  images: true,
  description: true,
  public: true,
  ownerId: true,
  plantId: true,
  takenAt: true,
};

export const createPhoto = (data: any, file: LocalFile) => {
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
};

export const removePhoto = async (id: number, ownerId?: number) => {
  const photo = await prisma.photo.delete({ where: { id, ownerId } });

  // no need to check for ownerId as we checked above
  // yeah, we update the reference and then we check if it's zero to delete
  // it's still possibly less operations than check and update/check and delete
  const { references } = await prisma.hash.update({
    where: { id: photo.hashId },
    data: { references: { decrement: 1 } },
  });

  // if there are no references left, we remove the Hash entry and the files
  if (references === 0) {
    await prisma.hash.delete({ where: { id: photo.hashId } });

    const images: any = photo.images;

    if (images) {
      let files: any[] = [...Object.values(images.path)];

      if (images.webp) files = [...files, ...Object.values(images.webp)];

      for (const file of files) {
        await filesystem.removeFile(file);
      }

      // FIXME: make it so it doesn't obliterate everything else in the directories
      // if (files.length > 0) {
      //   const dir: string[] = path.dirname(files[0]).split('/');
      //   const data: string = dir.slice(0, dir.length - configFiles.folder.division + 1).join('/');

      //   await filesystem.removeDir(data);
      // }
    }
  }

  return photo;
};
