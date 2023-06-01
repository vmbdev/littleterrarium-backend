import type { RequestHandler } from 'express';
import { Condition, Prisma } from '@prisma/client'
import { LTRes } from '../helpers/ltres';
import { removePhoto } from '../helpers/photomanager';
import { prepareForSortName } from '../helpers/textparser';
import prisma from '../prismainstance';
import { plants as plantsConfig } from '../../littleterrarium.config';
import dayjs from 'dayjs';

const nextDate = (last: Date, freq: number): Date => {
  return dayjs(last).add(freq, 'days').toDate();
}

/**
 * Express Middleware that creates a Plant object in the database.
 * Even though we receive a Plant-like object, we specify which properties are allowed to be stored
 * and check each of them for security sake.
 */
const create : RequestHandler = async (req, res, next) => {
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
    'public'
  ];
  const data: any = {};

  // if (!req.body.specieId && !req.body.customName) return next({ error: 'PLANT_SPECIE_OR_NAME' });

  for (const field of requiredFields) {
    if (!req.body[field]) return next(LTRes.msg('MISSING_FIELD').errorField(field));
    else if (field === 'locationId') data.locationId = req.parser.locationId;
    else data[field] = req.body[field];
  }

  for (const field of optionalFields) {
    if (req.body[field]) {
      switch (field) {
        case 'condition': {
          if (!Condition.hasOwnProperty(req.body.condition)) return next(LTRes.msg('PLANT_CONDITION'));
          else data.condition = Condition[req.body.condition as Condition];
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
          data[field] = date;
          break;
        }
        case 'public': {
          data.public = ((req.body.public === true) || (req.body.public === 'true'));
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
  
  // if water/fertiliser frequencies and last times are given,
  // calculate the next time it must be done
  if (req.parser.waterFreq && req.body.waterLast && dayjs(req.parser.waterLast).isValid() && +req.body.waterFreq) {
    data.waterNext = nextDate(req.body.waterLast, req.parser.waterFreq);
  }
  if (req.parser.fertFreq && req.body.fertLast && dayjs(req.parser.fertLast).isValid() && +req.body.fertFreq) {
    data.fertNext = nextDate(req.body.fertLast, req.parser.fertFreq);
  }

  data.ownerId = req.auth.userId;

  try {
    if (!data.customName && data.specieId) {
      const specie = await prisma.specie.findUnique({ where: { id: data.specieId }});
      data.sortName = specie?.name;
    }

    const plant = await prisma.plant.create({ data });

    res.send(plant);
  } catch (err) {
    next(LTRes.createCode(500));
  }
}

/**
 * Express Middleware to request a list of Plant objects optionally filtered by locationId.
 * The object contains one Photo object as well as the Specie object related to it.
 */
const find : RequestHandler = async (req, res, next) => {
  const query: Prisma.PlantFindManyArgs = {};
  let photos: Prisma.Plant$photosArgs | undefined;

  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
  if (req.query.cover === 'true') {
    photos = { take: 1, select: { images: true } };
  }
  else photos = undefined;

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    };

    if (photos) photos.where = { public: true };
  }
  else query.where = { ownerId: req.auth.userId };

  if (req.query.filter) {
    query.where = {
      ...query.where,
      sortName: {
        contains: prepareForSortName(req.query.filter as string),
      }
    }
  }

  if (req.query.limit && (+req.query.limit > 0)) {
    query.take = +req.query.limit;
  }
  else query.take = plantsConfig.number;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor }
    query.skip = 1;
  }

  if (req.query.sort) {
    let order: 'asc' | 'desc' = 'asc';

    if (req.query.order && (req.query.order === 'desc')) order = 'desc';

    if (req.query.sort === 'name') query.orderBy = [{ sortName: order }];
    else if (req.query.sort === 'date') query.orderBy = [{ createdAt: order }];
  }

  query.include = {
    photos: photos ? photos : false,
    cover: photos ? true : false,
    specie: {
      select: { name: true, commonName: true }
    }
  };

  const plants = await prisma.plant.findMany(query);
  res.send(plants);
}

/**
 * Express Middleware to request a Plant object by id.
 * The object contains all of the Photo objects linked to the plant, as well
 * as its Specie object.
 */
const findOne: RequestHandler = async (req, res, next) => {
  const query: any = {
    where: { id: req.parser.id },
    include: {
      // photos: true, //(req.query.photos === 'true'),
      cover: (req.query.cover === 'true'),
      specie: true
    }
  };

  // if (req.query.photos === 'true') {
  //   query.include.photos = {
  //     select: { id: true, images: true, public: true, takenAt: true }
  //   }
  // }
  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
  if (req.query.cover === 'true') {
    query.include.photos = {
      take: 1,
      select: { images: true }
    }
  }

  const plant = await prisma.plant.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (plant) {
    if (plant.public || (plant.ownerId === req.auth.userId)) res.send(plant);
    else return next(LTRes.createCode(403));
  }
  else next(LTRes.msg('PLANT_NOT_FOUND').setCode(404));
}

/**
 * Express Middleware to update an existing Plant object by id.
 * Like when creating, we manually introduce the fields in the final object.
 */
const modify: RequestHandler = async (req, res, next) => {
  const fields = [
    'locationId', 'specieId', 'coverId', 'customName', 'description', 'condition',
    'waterFreq', 'waterLast', 'fertFreq', 'fertLast', 'fertType', 'potType',
    'potSize', 'soil', 'public', 'removeSpecie', 'removeCover'
  ];
  const data: any = {};

  for (const field of Object.keys(req.body)) {
    if (fields.includes(field)) {
      switch (field) {
        case 'condition': {
          const condition = req.body.condition;

          if (condition === null) {
            data.condition = null;
          }
          else if (Condition.hasOwnProperty(condition)) {
            data.condition = Condition[condition as Condition];
          }
          else return next(LTRes.msg('PLANT_CONDITION'));

          break;
        }
        case 'customName': {
          // otherwise it screws sorting
          if (!req.body.customName || (req.body.customName === '')) {
            data.customName = null;
          }
          else {
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
          const lastField = req.body[field];

          if (lastField) {
            const date = new Date(lastField);
            data[field] = date;
          }
          else data[field] = null;

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
          data.public = ((req.body.public === true) || (req.body.public === 'true'));
          break;
        }
        default:
          data[field] = req.body[field];
      }
    }
  }

  try {
    let plant = await prisma.plant.update({
      where: {
        id: req.parser.id,
        ownerId: req.auth.userId
      },
      // TODO: make it optional?
      include: {
        cover: true,
        specie: true
      },
      data
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
        const specie = await prisma.specie.findUnique({ where: { id: plant.specieId }});
        plantUpdatedData.sortName = specie?.name;
      }
      else plantUpdatedData.sortName = null;
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
      plantUpdatedData.waterNext = nextDate(req.body.waterLast, req.parser.waterFreq);
    }
    else if (!plant.waterLast) plantUpdatedData.waterNext = null;

    if (plant.fertFreq && plant.fertLast) {
      plantUpdatedData.fertNext = nextDate(req.body.fertLast, req.parser.fertFreq);
    }
    else if (!plant.fertLast) plantUpdatedData.fertNext = null;

    if (Object.keys(plantUpdatedData).length > 0) {
      plant = await prisma.plant.update({
        where: {
          id: req.parser.id,
          ownerId: req.auth.userId
        },
        include: {
          cover: true,
          specie: true
        },
        data: plantUpdatedData
      });
    }

    res.send(plant);
  } catch (err) {
    next(LTRes.msg('PLANT_NOT_VALID'));
  }
}

const getPhotos: RequestHandler = async (req, res, next) => {
  const plant = await prisma.plant.findUnique({
    select: { public: true, ownerId: true },
    where: { id: req.parser.id }
  });

  if (!plant) return next(LTRes.createCode(404));
  else {
    if ((!plant.public) && (plant.ownerId !== req.auth.userId)) {
      return next(LTRes.createCode(403));
    }

    else {
      const query: any = {
        where: {
          plantId: req.parser.id
        },
        select: {
          id: true,
          images: true,
          description: true,
          public: true,
          ownerId: true,
          plantId: true,
          takenAt: true
        },
        orderBy: [
          { takenAt: 'asc' },
          { id: 'desc' }
        ],
      }
 
      const photos = await prisma.photo.findMany(query);
  
      res.send(photos);
    }
  }
}

const getCover: RequestHandler = async (req, res, next) => {
  if (req.parser.id) {
    const plant = await prisma.plant.findUnique({
      select: { coverId: true, ownerId: true, public: true },
      where: { id: req.parser.id }
    });

    if (plant) {
      if ((plant.ownerId === req.auth.userId) || plant.public) res.send({ coverId: plant.coverId });
      else return next(LTRes.createCode(403));
    }
    else next(LTRes.msg('PLANT_NOT_FOUND').setCode(404));
  }
}

/**
 * Remove a Plant object by its id.
 */
const remove: RequestHandler = async (req, res, next) => {
  const plant = await prisma.plant.delete({
    where: {
      id: req.parser.id,
      ownerId: req.auth.userId
    },
    include: { photos: true }
  });

  if (plant) {
    // update references of the hashes of the photos
    for (const photo of plant.photos) {
      removePhoto(photo.id, req.auth.userId);
    }
    res.send(LTRes.createCode(204));
  }
  else next(LTRes.msg('PLANT_NOT_VALID'));
}

export default {
  create,
  find,
  findOne,
  getPhotos,
  getCover,
  modify,
  remove
};