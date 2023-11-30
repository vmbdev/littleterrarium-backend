import { RequestHandler } from 'express';
import prisma from "../prismainstance";
import { createPhoto, removePhoto } from '../helpers/photomanager';
import { LTRes, NavigationData } from '../helpers/ltres';
import { Photo, Prisma } from '@prisma/client';

const PhotoColumnSelection: Prisma.PhotoSelect = {
  id: true,
  images: true,
  description: true,
  public: true,
  ownerId: true,
  plantId: true,
  takenAt: true
};

const create: RequestHandler = async (req, res, next) => {
  if (!req.disk.files || (req.disk.files.length === 0)) {
    return next(LTRes.msg('PHOTO_NOT_FOUND'));
  }

  const data: any = {};
  const optionalFields = ['description', 'public', 'takenAt'];

  data.ownerId = req.auth.userId;
  data.plantId = req.parser.plantId;

  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }
      else if (field === 'takenAt') data.takenAt = new Date(req.body.takenAt);
      else data[field] = req.body[field];
    }
  }

  const ops = req.disk.files.map((file) => createPhoto(data, file));

  await prisma.$transaction(ops);

  res.send(LTRes.createCode(200).plantId(data.plantId));
}

const findOne: RequestHandler = async (req, res, next) => {
  const query: Prisma.PhotoFindUniqueArgs = {
    where: { id: req.parser.id },
    select: PhotoColumnSelection
  };

  const photo = await prisma.photo.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (photo) {
    if ((photo.ownerId === req.auth.userId) || photo.public) res.send(photo);
    else return next(LTRes.createCode(403));
  }
  else next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
}

const getNavigation: RequestHandler = async (req, res, next) => {
  const currentPhoto = await prisma.photo.findUnique({
    select: { plantId: true, ownerId: true, takenAt: true },
    where: { id: req.parser.id }
  });

  
  if (currentPhoto) {
    const requireBeingPublic = (currentPhoto.ownerId !== req.session.userId) ? true : undefined
    const query: Prisma.PhotoFindFirstArgs = {
      select: { id: true },
      take: 1,
      skip: 1,
      cursor: {
        id: req.parser.id
      },
      where: {
        plantId: currentPhoto.plantId,
        public: requireBeingPublic
      },
    }

    const nextPhoto = await prisma.photo.findFirst({
      ...query,
      orderBy: [
        { takenAt: 'desc' },
        { id: 'desc' }
      ],
    });

    const prevPhoto = await prisma.photo.findFirst({
      ...query,
      orderBy: [
        { takenAt: 'asc' },
        { id: 'asc' }
      ],
    });

    const navigation: NavigationData = {
      prev: prevPhoto ? prevPhoto : undefined,
      next: nextPhoto ? nextPhoto : undefined
    };

    res.send(navigation);
  }
  else return next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
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
    const photo = await prisma.photo.update({
      where: {
        id: req.parser.id,
        ownerId: req.auth.userId
      },
      data,
      select: PhotoColumnSelection
    });
    res.send(photo);

  } catch (err) {
    next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
  }
}

const remove: RequestHandler = async (req, res, next) => {
  try {
    await removePhoto(req.parser.id, req.auth.userId!);

    res.send(LTRes.createCode(204));
  } catch (err) {
    next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
  }
}

export default {
  create,
  findOne,
  getNavigation,
  modify,
  remove
};