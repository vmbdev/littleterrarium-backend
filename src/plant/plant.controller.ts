import type { RequestHandler } from 'express';
import { Condition, Prisma } from '@prisma/client';

import prisma from '../prisma.js';
import { LTRes } from '../helpers/ltres.js';
import { prepareForSortName } from '../helpers/dataparser.js';
import { SortColumn, SortOrder } from './plant.service.js';
import { PhotoColumnSelection } from '../photo/photo.service.js';
import { plants as plantsConfig } from '../config/littleterrarium.config.js';

/**
 * Express Middleware that creates a Plant object in the database.
 * Even though we receive a Plant-like object, we specify which properties
 * are allowed to be stored and check each of them for security sake.
 */
const create: RequestHandler = async (req, res, next) => {
  const requiredFields = ['locationId'];
  const optionalFields = [
    'specieId',
    'customName',
    'description',
    'condition',
    'waterFreq',
    'waterLast',
    'fertFreq',
    'fertLast',
    'fertType',
    'potType',
    'potSize',
    'soil',
    'public',
  ];
  const data: any = {};

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(LTRes.msg('MISSING_FIELD').errorField(field));
    } else if (field === 'locationId') data.locationId = req.parser.locationId;
    else data[field] = req.body[field];
  }

  for (const field of optionalFields) {
    if (req.body[field]) {
      switch (field) {
        case 'condition': {
          if (!Condition.hasOwnProperty(req.body.condition)) {
            return next(LTRes.msg('PLANT_CONDITION'));
          } else data.condition = Condition[req.body.condition as Condition];

          break;
        }
        case 'specieId':
        case 'waterFreq':
        case 'fertFreq':
        case 'potSize': {
          data[field] = req.parser[field];
          break;
        }
        case 'waterLast':
        case 'fertLast': {
          const date = new Date(req.body[field]);

          if (date.valueOf()) data[field] = date;

          break;
        }
        case 'public': {
          data.public = req.body.public === true || req.body.public === 'true';
          break;
        }
        case 'customName': {
          // if customName is present, it has priority for sortName
          if (req.body.customName) {
            data.sortName = prepareForSortName(req.body.customName);
            data.customName = req.body.customName;
          }
          break;
        }
        default:
          data[field] = req.body[field];
      }
    }
  }

  data.ownerId = req.auth.userId;

  try {
    const plant = await prisma.plant.ltCreate(data);

    res.send(plant);
  } catch (err) {
    next(LTRes.createCode(500));
  }
};

/**
 * Express Middleware to request a list of Plant objects optionally
 * filtered by locationId.
 * The object contains one Photo object as well as the Specie object related
 * to it.
 */
const find: RequestHandler = async (req, res, _next) => {
  const query: Prisma.PlantFindManyArgs = {};
  let photos: Prisma.Plant$photosArgs | undefined;

  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
  if (req.query.cover === 'true') {
    photos = { take: 1, select: { images: true } };
  } else photos = undefined;

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && req.parser.userId !== req.auth.userId) {
    query.where = {
      ownerId: req.parser.userId,
      public: true,
    };

    if (photos) photos.where = { public: true };
  } else query.where = { ownerId: req.auth.userId };

  query.include = {
    photos: photos ? photos : false,
    cover: photos ? true : false,
    specie: {
      select: { name: true, commonName: true },
    },
  };

  const plants = await prisma.plant.ltFindMany(query, {
    filter: (req.query.filter as string) ?? undefined,
    limit: req.parser.limit,
    cursor: req.parser.cursor,
    sort: (req.query.sort as SortColumn) ?? undefined,
    order: (req.query.order as SortOrder) ?? undefined,
  });

  res.send(plants);
};

/**
 * Express Middleware to request a Plant object by id.
 * The object contains all of the Photo objects linked to the plant, as well
 * as its Specie object.
 */
const findOne: RequestHandler = async (req, res, next) => {
  const query: Prisma.PlantFindUniqueArgs = { where: { id: req.parser.id } };
  query.include = {
    // photos: true, //(req.query.photos === 'true'),
    cover: req.query.cover === 'true',
    specie: true,
  };

  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
  if (req.query.cover === 'true') {
    query.include.photos = {
      take: 1,
      select: { images: true },
    };
  }

  const plant = await prisma.plant.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (plant) {
    if (plant.public || plant.ownerId === req.auth.userId) {
      res.send(plant);
    } else return next(LTRes.createCode(403));
  } else next(LTRes.msg('PLANT_NOT_FOUND').setCode(404));
};

/**
 * Express Middleware to update an existing Plant object by id.
 * Like when creating, we manually introduce the fields in the final object.
 */
const modify: RequestHandler = async (req, res, next) => {
  const fields = [
    'locationId',
    'specieId',
    'coverId',
    'customName',
    'description',
    'condition',
    'waterFreq',
    'waterLast',
    'fertFreq',
    'fertLast',
    'fertType',
    'potType',
    'potSize',
    'soil',
    'public',
    'removeSpecie',
    'removeCover',
  ];
  const data: any = {};

  for (const field of Object.keys(req.body)) {
    if (fields.includes(field)) {
      switch (field) {
        case 'condition': {
          const condition = req.body.condition;

          if (condition === null) {
            data.condition = null;
          } else if (Condition.hasOwnProperty(condition)) {
            data.condition = Condition[condition as Condition];
          } else return next(LTRes.msg('PLANT_CONDITION'));

          break;
        }
        case 'customName': {
          // otherwise it screws sorting
          if (!req.body.customName || req.body.customName === '') {
            data.customName = null;
          } else {
            data.customName = req.body.customName;
            data.sortName = prepareForSortName(req.body.customName);
          }

          break;
        }
        case 'locationId':
        case 'specieId':
        case 'coverId':
        case 'waterFreq':
        case 'fertFreq':
        case 'potSize': {
          data[field] = req.parser[field];
          break;
        }
        case 'waterLast':
        case 'fertLast': {
          const date = new Date(req.body[field]);

          if (date.valueOf()) data[field] = date;

          break;
        }
        case 'removeSpecie': {
          data.specieId = null;
          break;
        }
        case 'removeCover': {
          data.coverId = null;
          break;
        }
        case 'public': {
          data.public = req.body.public === true || req.body.public === 'true';
          break;
        }
        default:
          data[field] = req.body[field];
      }
    }
  }

  try {
    const plant = await prisma.plant.ltUpdate(
      data,
      req.parser.id,
      req.auth.userId! // FIXME: take care of !
    );

    res.send(plant);
  } catch (err) {
    next(LTRes.msg('PLANT_NOT_VALID'));
  }
};

const moveLocation: RequestHandler = async (req, res, next) => {
  const ids = req.parser.id;

  if (ids.length > plantsConfig.maxForMassAction) {
    return next(
      LTRes.msg('PLANT_MAX_EXCEEDED').errorValues(plantsConfig.maxForMassAction)
    );
  }

  const count = await prisma.plant.moveLocation(ids, req.parser.locationId);

  if (count === 0) return next(LTRes.msg('PLANT_NOT_FOUND'));
  else if (count < ids.length) return next(LTRes.msg('PLANT_MOVE_INCOMPLETE'));
  else res.send(LTRes.createCode(204));
}

const getPhotos: RequestHandler = async (req, res, next) => {
  const plant = await prisma.plant.findUnique({
    select: { public: true, ownerId: true },
    where: { id: req.parser.id },
  });

  if (!plant) return next(LTRes.createCode(404));
  else {
    if (!plant.public && plant.ownerId !== req.auth.userId) {
      return next(LTRes.createCode(403));
    } else {
      const query: any = {
        where: {
          plantId: req.parser.id,
        },
        select: PhotoColumnSelection,
        orderBy: [{ takenAt: 'desc' }, { id: 'desc' }],
      };

      const photos = await prisma.photo.findMany(query);

      res.send(photos);
    }
  }
};

const getCover: RequestHandler = async (req, res, next) => {
  if (req.parser.id) {
    const cover = await prisma.plant.getCoverId(req.parser.id);

    if (cover) {
      if (cover.ownerId === req.auth.userId || cover.public) {
        res.send({ coverId: cover.coverId });
      } else return next(LTRes.createCode(403));
    } else next(LTRes.msg('PLANT_NOT_FOUND').setCode(404));
  }
};

/**
 * Remove one or many Plants by its ids.
 */
const remove: RequestHandler = async (req, res, next) => {
  const ids = req.parser.id;

  if (ids.length > plantsConfig.maxForMassAction) {
    return next(
      LTRes.msg('PLANT_MAX_EXCEEDED').errorValues(plantsConfig.maxForMassAction)
    );
  }

  // FIXME !
  const deleted = await prisma.plant.ltRemove(ids, req.auth.userId!);

  if (deleted === 0) return next(LTRes.msg('PLANT_NOT_VALID'));
  else res.send(LTRes.createCode(204));
};

const getCount: RequestHandler = async (_req, res, _next) => {
  const count = await prisma.plant.count();

  res.send({ count });
};

export default {
  create,
  find,
  findOne,
  getPhotos,
  getCover,
  getCount,
  modify,
  moveLocation,
  remove,
};
