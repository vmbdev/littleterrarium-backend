import type { RequestHandler } from 'express';
import { Condition, Photo } from '@prisma/client'
import { LTRes } from '../helpers/ltres';
import { removePhoto } from '../helpers/photomanager';
import prisma from '../prismainstance';
import dayjs from 'dayjs';

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
        default:
          data[field] = req.body[field];
      }
    }
  }
  
  // if water/fertiliser frequencies and last times are given,
  // calculate the next time it must be done
  if (req.parser.waterFreq && req.body.waterLast && dayjs(req.parser.waterLast).isValid() && +req.body.waterFreq) {
    data.waterNext = dayjs(req.body.waterLast).add(req.parser.waterFreq, 'days').toDate();
  }
  if (req.parser.fertFreq && req.body.fertLast && dayjs(req.parser.fertLast).isValid() && +req.body.fertFreq) {
    data.fertNext = dayjs(req.body.fertLast).add(req.parser.fertFreq, 'days').toDate();
  }

  data.ownerId = req.auth.userId;

  try {
    const plant = await prisma.plant.create({ data });

    res.send(LTRes.msg('PLANT_CREATED').plant(plant));
  } catch (err) {
    next(LTRes.createCode(500));
  }
}

/**
 * Express Middleware to request a list of Plant objects optionally filtered by locationId.
 * The object contains one Photo object as well as the Specie object related to it.
 */
const find : RequestHandler = async (req, res, next) => {
  const query: any = {};
  let photos: any;

  if (req.query.photos === 'true') {
    photos = { select: { id: true, images: true, public: true, takenAt: true } };
  }
  else if (req.query.cover === 'true') {
  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
    photos = { take: 1, select: { images: true } };
  }
  else photos = null;

  // Sorting by create time or by plant/specie name
  // if (req.query.sortby) {
  //   let sortMode;

  //   if (req.query.sort && ((req.query.sort === 'asc') || req.query.sort === 'desc')) sortMode = req.query.sort;
  //   else sortMode = 'asc';

  //   if (req.query.sortby === 'created') query.orderBy = { id: sortMode };
  //   else if (req.query.sortby === 'name') query.orderBy = [{ customName: sortMode }, { specie: { name: sortMode } }];
  //   else if (req.query.sortby === 'specie') query.orderBy = [{ specie: { name: sortMode } }, { customName: sortMode }];
  // }


  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    };

    if (photos) photos.where = { public: true };
  }
  else query.where = { ownerId: req.auth.userId };

  // Can only get own user's location's plants. To get other user's, go through location controller
  // this is to avoid having to check on location table whether it's public or not
  if (req.parser.locationId) query.where.locationId = req.parser.locationId;

  query.select = {
    id: true,
    customName: true,
    createdAt: true,
    photos: photos ? photos : false,
    cover: (req.query.cover === 'true'),
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

  if (req.query.photos === 'true') {
    query.include.photos = {
      select: { id: true, images: true, public: true, takenAt: true }
    }
  }
  // if user requests cover, we send both the cover relationship and one
  // photo, in case the cover doesn't exists
  else if (req.query.cover === 'true') {
    query.include.photos = {
      take: 1,
      select: { images: true }
    }
  }

  const plant = await prisma.plant.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (plant) {
    if (plant.ownerId === req.auth.userId) res.send(plant);
    else if ((plant.ownerId !== req.auth.userId) && plant.public) {
      // extremely inelegant, but Prisma doesn't add relations to interfaces
      // in TypeScript so we can't access plant.photos
      const plantWithPublicPhotos = plant as any;

      if (plantWithPublicPhotos.photos) {
        plantWithPublicPhotos.photos = plantWithPublicPhotos.photos.filter((photo: Photo) => photo.public);
      }

      res.send(plantWithPublicPhotos);
    }
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
          if (req.body.condition === null) data.condition = null;
          else if (Condition.hasOwnProperty(req.body.condition)) {
            data.condition = Condition[req.body.condition as Condition];
          }
          else return next(LTRes.msg('PLANT_CONDITION'));

          break;
        }
        case 'customName': {
          // otherwise it screws sorting
          if (req.body.customName === '') data.customName = null;
          else data.customName = req.body.customName;

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
          data[field] = date;
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
      data
    });

    /**
     * Check if the object has both frequency and last time for both water and
     * fertlizer. If so, updates the waterNext/waterFreq property.
     * This is tricky, as it requires an update from the object that has been
     * just updated, but it's needed as only one property may have been updated
     * and thus received by the user (i.e. waterFreq but no waterLast).
     * In an environment with a specied database that supports both triggers
     * and date operations, it can be done with such trigger.
     * */
    const plantUpdatedData: any = {};

    if (plant.waterFreq && plant.waterLast) {
      plantUpdatedData.waterNext = dayjs(plant.waterLast).add(plant.waterFreq, 'days').toDate();
    }

    if (plant.fertFreq && plant.fertLast) {
      plantUpdatedData.fertNext = dayjs(plant.fertLast).add(plant.fertFreq, 'days').toDate();
    }

    if (Object.keys(plantUpdatedData).length > 0) {
      plant = await prisma.plant.update({
        where: {
          id: req.parser.id,
          ownerId: req.auth.userId
        },
        data: plantUpdatedData
      });
    }

    res.send(LTRes.msg('PLANT_UPDATED').plant(plant));
  } catch (err) {
    next(LTRes.msg('PLANT_NOT_VALID'));
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
    res.send(LTRes.msg('PLANT_REMOVED'));
  }
  else next(LTRes.msg('PLANT_NOT_VALID'));
}

export default {
  create,
  find,
  findOne,
  modify,
  remove
};