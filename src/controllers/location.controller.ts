import { RequestHandler } from 'express';
import { Prisma, Light, Plant } from '@prisma/client';
import prisma from '../prismainstance';
import { LTRes } from '../helpers/ltres';

const create: RequestHandler = async (req, res, next) => {
  // public is not really optional, but it has a default value
  // we don't include 'picture' as it's managed through req.disk
  const requiredFields = ['name', 'light'];
  const optionalFields = ['public'];
  const data: any = {};

  // check through the mandatory fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(LTRes.msg('MISSING_FIELD').errorField(field));
    }
    else if ((field === 'light') && !Light.hasOwnProperty(req.body[field])) {
      return next(LTRes.msg('INCORRECT_FIELD').errorField(field).errorValues(Object.values(Light)));
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
  if (req.disk.file) {
    data.pictures = {
      path: req.disk.file.path,
      webp: req.disk.file.webp ? req.disk.file.webp : undefined
    };
  }

  data.ownerId = req.auth.userId;
  try {
    const newLocation = await prisma.location.create({ data });
    res.send(newLocation);
  } catch (err) {
    next(LTRes.createCode(500));
  }
}

const find: RequestHandler = async (req, res, next) => {
  const query: any = {
    orderBy: { createdAt: 'asc' },
  };

  // if asking for a different user, return only the ones that are public
  if (req.parser.userId && (req.parser.userId !== req.auth.userId)) {
    query.where = {
      ownerId: req.parser.userId,
      public: true
    };
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

  const locations = await prisma.location.findMany(query);
  res.send(locations);
}

const findPlants: RequestHandler = async (req, res, next) => {
  const location = await prisma.location.findUnique({
    select: { public: true, ownerId: true },
    where: { id: req.parser.id }
  });

  if (!location) return next(LTRes.createCode(404));
  else {
    if ((!location.public) && (location.ownerId !== req.auth.userId)) {
      return next(LTRes.createCode(403));
    }

    else {
      const limit: number | undefined = (req.query.limit && (+req.query.limit > 0)) ? +req.query.limit : undefined;
      const query: any = {
        take: limit,
        include: { 
          cover: {
            select: { images: true }
          },
          photos: {
            take: 1,
            select: { images: true }
          },
          specie: {
            select: { name: true, commonName: true }
          }
        },
        where: {
          locationId: req.parser.id
        }
      }
 
      const plants = await prisma.plant.findMany(query);
  
      res.send(plants);
    }
  }
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
  const location = await prisma.location.findUnique({ where: { id: req.parser.id } });

  if (location) {
    if (location.ownerId === req.auth.userId) res.send(location);
    // if requesting user is not the owner, send only if it's public
    else if ((location.ownerId !== req.auth.userId) && location.public) {
      // extremely inelegant, but Prisma doesn't add relations to interfaces
      // so we can't access location.plants
      const locationWithPublicPlants = location as any;

      if (locationWithPublicPlants.plants) {
        locationWithPublicPlants.plants = locationWithPublicPlants.plants.filter((plant: Plant) => plant.public);
      }

      res.send(locationWithPublicPlants);
    }
    else return next(LTRes.createCode(403));
  }
  else next(LTRes.msg('LOCATION_NOT_FOUND').setCode(404));
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
  else if (req.disk.file) {
    data.pictures = {
      path: req.disk.file.path,
      webp: req.disk.file.webp ? req.disk.file.webp : undefined
    };
  }

  // it's already checked by auth.checkOwnership, but just to be extra paranoid
  // we add it to the where clause req.auth.userId is authorised by auth middleware
  const location = await prisma.location.update({
    where: {
      id: req.parser.id,
      ownerId: req.auth.userId
    },
    data
  });

  if (location) res.send(location);
  else next(LTRes.msg('LOCATION_NOT_VALID'));
}

const remove: RequestHandler = async (req, res, next) => {
  const location = await prisma.location.delete({
    where: {
      id: req.parser.id,
      ownerId: req.auth.userId
    }
  });

  if (location) res.send(LTRes.createCode(204));
  else next(LTRes.msg('LOCATION_NOT_VALID'));
}

export default {
  create,
  find,
  findPlants,
  findOne,
  modify,
  remove
};