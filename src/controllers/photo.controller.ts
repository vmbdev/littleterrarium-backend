import { RequestHandler } from 'express';
import { files as configFiles } from '../../littleterrarium.config';
import prisma from "../prismainstance";
import filesystem from '../helpers/filesystem';
import path from 'path';

const create: RequestHandler = async (req, res, next) => {
  if (!req.disk.files || (req.disk.files.length === 0)) return next({ error: 'PHOTO_NOT_FOUND' });

  const data: any = {};
  const optionalFields = ['description', 'public'];

  data.ownerId = req.auth.userId;
  data.plantId = req.parser.plantId;

  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }
      else data[field] = req.body[field];
    }
  }

  const ops = req.disk.files.map((file) => {
    const photoData = { ...data };
    photoData.images = file.url;
    
    // on both update or insert, we always create an entry in Photos
    return prisma.hash.upsert({
      where: { hash: file.hash },
      update: {
        references: { increment: 1 },
        photos: { create: photoData }
      },
      create: {
        hash: file.hash,
        localPath: file.path,
        photos: { create: photoData }
      }
    });
  });
  
  await prisma.$transaction(ops);
  res.send({ msg: 'PHOTOS_CREATED' });
}

const find: RequestHandler = async (req, res, next) => {
  const query: any = {
    select: { id: true, images: true, description: true, public: true, takenAt: true }
  };

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    }
  }
  else query.where = { ownerId: req.auth.userId };

  if (req.parser.plantId) query.where.plantId = req.parser.plantId;

  const photos = await prisma.photo.findMany(query);

  if (photos.length > 0) res.send(photos);
  else next({ error: 'PHOTO_NOT_FOUND' });
}

const findOne: RequestHandler = async (req, res, next) => {
  const query = {
    where: { id: req.parser.id },
    select: { id: true, images: true, description: true, public: true, ownerId: true, plantId: true, takenAt: true }
  };

  const photo = await prisma.photo.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (photo) {
    if ((photo.ownerId === req.auth.userId) || photo.public) res.send(photo);
    else return next({ code: 403 });
  }
  else next({ error: 'PHOTO_NOT_FOUND', code: 404 });
}

// let's be conservative here:
// user can only update the description and the takenAt date, not the picture
const modify: RequestHandler = async (req, res, next) => {
  const data: any = {};
  const fields = ['description', 'takenAt', 'public'];

  for (const field of fields) {
    if (field === 'takenAt') data.takenAt = new Date(req.body.takenAt);
    else if (field === 'public') {
      data.public = ((req.body.public === true) || (req.body.public === 'true'));
    }
    else data[field] = req.body[field];
  }

  try {
    await prisma.photo.update({
      where: {
        id: req.parser.id,
        ownerId: req.auth.userId
      },
      data,
    });
    res.send({ msg: 'PHOTO_UPDATED' });
  } catch (err) {
    next({ error: 'PHOTO_NOT_FOUND' });
  }
}

const remove: RequestHandler = async (req, res, next) => {
  try {
    const { hashId } = await prisma.photo.delete({
      where: {
        id: req.parser.id,
        ownerId: req.auth.userId
      }
    });

    // no need to check for ownerId as we checked above
    // yeah, we update the reference and then we check if it's zero to delete
    // it's still possibly less operations than check and update/check and delete
    const { references } = await prisma.hash.update({
      where: { id: hashId },
      data: { references: { decrement: 1 } }
    });

    // if there are no references left, we remove the Hash entry and the files
    if (references === 0) {
      const { localPath } = await prisma.hash.delete({ where: { id: hashId } });

      const files: any[] = Object.values(localPath as any);
      for (const file of files) {
        await filesystem.removeFile(file);
      }

      //TODO: make it so it doesn't obliterate everything else in the directories
      // if (files.length > 0) {
      //   const dir: string[] = path.dirname(files[0]).split('/');
      //   const data: string = dir.slice(0, dir.length - configFiles.folder.division + 1).join('/');

      //   await filesystem.removeDir(data);
      // }
    }

    res.send({ msg: 'PHOTO_REMOVED' });
  } catch (err) {
    next({ error: 'PHOTO_NOT_FOUND' });
  }
}

export default {
  create,
  find,
  findOne,
  modify,
  remove
};