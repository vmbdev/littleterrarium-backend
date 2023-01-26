import { RequestHandler } from 'express';
import { Prisma, Light, Location, Plant } from '@prisma/client';
import prisma from '../prismainstance';

const create: RequestHandler = async (req, res, next) => {
  // public is not really optional, but it has a default value
  // we don't include 'picture' as it's managed through req.disk
  const requiredFields = ['name', 'light'];
  const optionalFields = ['public'];
  const data: any = {};

  // check through the mandatory fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next({ error: 'MISSING_FIELD', data: { field } });
    }
    else if ((field === 'light') && !Light.hasOwnProperty(req.body[field])) {
      return next({ error: 'INCORRECT_FIELD', data: { field, values: Object.values(Light) } });
    }

    data[field] = req.body[field];
  }

  // check through the optinal fields and add them if they're present
  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }
      else data[field] = req.body[field];
    }
  }

  // if picture
  if (req.disk.file) data.pictures = req.disk.file.url;

  data.ownerId = req.auth.userId;
  try {
    const newLocation = await prisma.location.create({ data });
    res.send({ msg: 'LOCATION_CREATED', location: newLocation });
  } catch (err) {
    next({ code: 500 });
  }
}

const find: RequestHandler = async (req, res, next) => {
  const query: any = {
    orderBy: { createdAt: 'asc' },
  };
  const plants: any = {}

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    };
    plants.where = {
      public: true
    }
  }
  else query.where = { ownerId: req.auth.userId };

  // when &plantcount is active in req.query, return the number of plants in the location
  if (req.query.plantcount) {
    query.include = {
      _count: {
        select: { plants: true }
      }
    };
  }

  else if (req.query.plants === 'true') {
    const limit: number | undefined = req.query.limit ? +req.query.limit : undefined;

    // a limit of 0 implies no limit
    plants.take = (limit && (limit > 0)) ? limit : undefined;
    plants.select = { id: true, specieId: true, customName: true };
    plants.select.photos = {
      take: 1,
      select: { images: true }
    }

    query.select = {
      id: true,
      name: true,
      pictures: true,
      plants
    };
  }

  const locations = await prisma.location.findMany(query);
  res.send(locations);
}

/**
 * Retrieve one location specified by ID.
 * As we don't know the owner beforehand, privacy check of the location
 * and the plants are checked upon retrieval from the database.
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 * @param {Express.NextFunction} next 
 */
const findOne: RequestHandler = async (req, res, next) => {
  const query: any = {
    where: { id: req.parser.id },
    select: { id: true, name: true, pictures: true, light: true, public: true, plants: false, ownerId: true }
   };

  if (req.query.plants === 'true') {
    const limit: number | undefined = req.query.limit ? +req.query.limit : undefined;

    query.select.plants = {
      take: (limit && (limit > 0)) ? limit : undefined,
      select: {
        id: true,
        specieId: true,
        customName: true,
        public: true,
        photos: {
          take: 1,
          select: { images: true }
        }
      }
    };
  }

  const location = await prisma.location.findUnique(query);

  if (location) {
    // if requesting user is not the owner, send only if it's public
    if (location.ownerId === req.auth.userId) res.send(location);
    else if ((location.ownerId !== req.auth.userId) && location.public) {
      // extremely inelegant, but Prisma doesn't add relations to interfaces so we can't access location.plants
      const locationWithPublicPlants = location as any;

      if (locationWithPublicPlants.plants) {
        locationWithPublicPlants.plants = locationWithPublicPlants.plants.filter((plant: Plant) => plant.public);
      }

      res.send(locationWithPublicPlants);
    }
    else return next({ code: 403 });
  }
  else next({ error: 'LOCATION_NOT_FOUND', code: 404 });
}

const modify: RequestHandler = async (req, res, next) => {
  const fields = ['name', 'light', 'public'];
  const data: any = {};

  for (const requestedField of Object.keys(req.body)) {
    if (fields.includes(requestedField)) {
      if (requestedField === 'public') {
        data.public = ((req.body.public === true) || (req.body.public === 'true'));
      }
      else data[requestedField] = req.body[requestedField];
    }
  }

  // picture
  if (req.body.removePicture) data.pictures = Prisma.JsonNull;
  else if (req.disk.file) data.pictures = req.disk.file.url;

  // it's already checked by auth.checkOwnership, but just to be extra paranoid
  // we add it to the where clause req.auth.userId is authorised by auth middleware
  const location = await prisma.location.update({
    where: {
      id: req.parser.id,
      ownerId: req.auth.userId
    },
    data
  });

  if (location) res.send({ msg: 'LOCATION_UPDATED', location });
  else next({ error: 'LOCATION_NOT_VALID' });
}

const remove: RequestHandler = async (req, res, next) => {
  const location = await prisma.location.delete({
    where: {
      id: req.parser.id,
      ownerId: req.auth.userId
    }
  });

  if (location) res.send({ msg: 'LOCATION_REMOVED' });
  else next({ error: 'LOCATION_NOT_VALID' });
}

export default {
  create,
  find,
  findOne,
  modify,
  remove
};