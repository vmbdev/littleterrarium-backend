import type { RequestHandler } from 'express';
import { Condition, Photo } from '@prisma/client'
import prisma from '../prismainstance';
import dayjs from 'dayjs';

/**
 * Express Middleware that creates a Plant object in the database.
 * Even though we receive a Plant-like object, we specify which properties are allowed to be stored
 * and check each of them for security sake.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
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
      if (!req.body[field]) return next({ error: 'MISSING_FIELD', data: { field } });
      else if (field === 'locationId') data.locationId = req.parser.locationId;
      else data[field] = req.body[field];
    }

    for (const field of optionalFields) {
      if (req.body[field]) {
        switch (field) {
          case 'condition': {
            if (!Condition.hasOwnProperty(req.body.condition)) return next({ error: 'PLANT_CONDITION' });
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

    if (req.body.waterFreq && req.body.waterLast && dayjs(req.body.waterFreq).isValid() && +req.body.waterLast) {
      data.waterNext = dayjs(req.body.waterLast).add(req.body.waterFreq, 'days').toDate();
    }

    data.ownerId = req.auth.userId;

    try {
      const plant = await prisma.plant.create({ data });

      res.send({ msg: 'PLANT_CREATED', plant });
    } catch (err) {
      next({ code: 500 });
    }
  }

/**
 * Express Middleware to request a list of Plant objects optionally filtered by locationId.
 * The object contains one Photo object as well as the Specie object related to it.
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const find : RequestHandler = async (req, res, next) => {
  const query: any = {};
  const photos: any = {
    take: 1,
    select: { id: true, images: true, public: true, takenAt: true }
  };

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    };
    photos.where = {
      public: true
    };
  }
  else query.where = { ownerId: req.auth.userId };

  if (req.parser.locationId) query.where.locationId = req.parser.locationId;

  query.select = {
    id: true,
    customName: true,
    photos,
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
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const findOne: RequestHandler = async (req, res, next) => {
  const query: any = {
    where: { id: req.parser.id },
    include: {
      photos: true,
      specie: true
    }
  };
  const plant = await prisma.plant.findUnique(query);

  // if requesting user is not the owner, send only if it's public
  if (plant) {
    if (plant.ownerId === req.auth.userId) res.send(plant);
    else if ((plant.ownerId !== req.auth.userId) && plant.public) {
      // extremely inelegant, but Prisma doesn't add relations to interfaces in TypeScript so we can't access plant.photos
      const plantWithPublicPhotos = plant as any;

      if (plantWithPublicPhotos.photos) {
        plantWithPublicPhotos.photos = plantWithPublicPhotos.photos.filter((photo: Photo) => photo.public);
      }

      res.send(plantWithPublicPhotos);
    }
    else return next({ code: 403 });
  }
  else next({ error: 'PLANT_NOT_FOUND', code: 404 });
}

/**
 * Express Middleware to update an existing Plant object by id.
 * Like when creating, we manually introduce the fields in the final object.
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const modify: RequestHandler = async (req, res, next) => {
  const fields = [
    'locationId', 'specieId', 'customName', 'description', 'condition',
    'waterFreq', 'waterLast', 'fertFreq', 'fertLast', 'fertType', 'potType',
    'potSize', 'soil', 'public'
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
          else return next({ error: 'PLANT_CONDITION' });

          break;
        }
        case 'locationId':
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

    res.send({ msg: 'PLANT_UPDATED', plant });
  } catch (err) {
    next({ error: 'PLANT_NOT_VALID' });
  }
}

/**
 * Remove a Plant object by its id.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const remove: RequestHandler = async (req, res, next) => {
  // FIXME: update photo hash references
  const plant = await prisma.plant.delete({ where: { id: req.parser.id, ownerId: req.auth.userId } });

  if (plant) res.send({ msg: 'PLANT_REMOVED' });
  else next({ error: 'PLANT_NOT_VALID' });
}

export default {
  create,
  find,
  findOne,
  modify,
  remove
};