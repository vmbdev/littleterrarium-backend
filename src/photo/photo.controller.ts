import { RequestHandler } from 'express';
import { Prisma } from '@prisma/client';

import prisma from '../prisma.js';
import { LTRes } from '../helpers/ltres.js';
import { PhotoColumnSelection } from './photo.service.js';

const create: RequestHandler = async (req, res, next) => {
  if (!req.disk.files || req.disk.files.length === 0) {
    return next(LTRes.msg('PHOTO_NOT_FOUND'));
  }

  const data: any = {};
  const optionalFields = ['description', 'public', 'takenAt'];

  data.ownerId = req.auth.userId;
  data.plantId = req.parser.plantId;

  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = req.body.public === true || req.body.public === 'true';
      } else if (field === 'takenAt') {
        const date = new Date(req.body.takenAt);

        if (date.valueOf()) data.takenAt = date;
      } else data[field] = req.body[field];
    }
  }

  const ops = req.disk.files.map((file) => prisma.photo.ltCreate(data, file));

  await prisma.$transaction(ops);

  res.send(LTRes.createCode(200).plantId(data.plantId));
};

const findOne: RequestHandler = async (req, res, next) => {
  const query: Prisma.PhotoFindUniqueArgs = {
    where: { id: req.parser.id },
    select: PhotoColumnSelection,
  };

  const photo = await prisma.photo.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (photo) {
    if (photo.ownerId === req.auth.userId || photo.public) res.send(photo);
    else return next(LTRes.createCode(403));
  } else next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
};

const getNavigation: RequestHandler = async (req, res, next) => {
  const navigation = await prisma.photo.getNavigation(
    req.parser.id,
    req.auth.userId!
  );

  if (navigation) res.send(navigation);
  else return next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
};

// let's be conservative here:
// user can only update the description and the takenAt date, not the picture
const modify: RequestHandler = async (req, res, next) => {
  const data: any = {};
  const fields = ['description', 'takenAt', 'public'];

  for (const field of fields) {
    if (field === 'takenAt') {
      const date = new Date(req.body.takenAt);

      if (date.valueOf()) data.takenAt = date;
    }
    else if (field === 'public') {
      data.public = req.body.public === true || req.body.public === 'true';
    } else data[field] = req.body[field];
  }

  try {
    const photo = await prisma.photo.update({
      where: {
        id: req.parser.id,
        ownerId: req.auth.userId,
      },
      data,
      select: PhotoColumnSelection,
    });
    res.send(photo);
  } catch (err) {
    next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
  }
};

const remove: RequestHandler = async (req, res, next) => {
  try {
    await prisma.photo.ltRemove(req.parser.id, req.auth.userId!);

    res.send(LTRes.createCode(204));
  } catch (err) {
    next(LTRes.msg('PHOTO_NOT_FOUND').setCode(404));
  }
};

export default {
  create,
  findOne,
  getNavigation,
  modify,
  remove,
};
