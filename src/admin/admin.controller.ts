import { RequestHandler } from 'express';
import { Prisma } from '@prisma/client';

import prisma from 'src/prismainstance';
import { PhotoColumnSelection } from 'src/helpers/photomanager';

const summary: RequestHandler = async (req, res, next) => {
  const [users, locations, plants, photos, species] = await Promise.all([
    prisma.user.count(),
    prisma.location.count(),
    prisma.plant.count(),
    prisma.photo.count(),
    prisma.specie.count(),
  ]);

  res.send({ users, locations, plants, photos, species });
};

const findAllUsers: RequestHandler = async (req, res, next) => {
  const query: Prisma.UserFindManyArgs = {};

  if (req.query.limit && +req.query.limit > 0) {
    query.take = +req.query.limit;
  } else query.take = 20;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor };
    query.skip = 1;
  }

  const users = await prisma.user.findMany(query);
  const usersWithoutPwd = users.map(({password, ...rest}) => rest);

  res.send(usersWithoutPwd);
};

const findAllLocations: RequestHandler = async (req, res, next) => {
  const query: Prisma.LocationFindManyArgs = {};

  if (req.query.limit && +req.query.limit > 0) {
    query.take = +req.query.limit;
  } else query.take = 20;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor };
    query.skip = 1;
  }

  const locations = await prisma.location.findMany(query);

  res.send(locations);
};

const findAllPlants: RequestHandler = async (req, res, next) => {
  const query: Prisma.PlantFindManyArgs = {};

  if (req.query.limit && +req.query.limit > 0) {
    query.take = +req.query.limit;
  } else query.take = 20;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor };
    query.skip = 1;
  }

  const plants = await prisma.plant.findMany(query);

  res.send(plants);
};

const findAllPhoto: RequestHandler = async (req, res, next) => {
  const query: Prisma.PhotoFindManyArgs = {};

  if (req.query.limit && +req.query.limit > 0) {
    query.take = +req.query.limit;
  } else query.take = 20;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor };
    query.skip = 1;
  }

  query.select = PhotoColumnSelection;

  const photos = await prisma.photo.findMany(query);

  res.send(photos);
};

const findAllSpecie: RequestHandler = async (req, res, next) => {
  const query: Prisma.SpecieFindManyArgs = {};

  if (req.query.limit && +req.query.limit > 0) {
    query.take = +req.query.limit;
  } else query.take = 20;

  if (req.query.cursor && +req.query.cursor) {
    query.cursor = { id: +req.query.cursor };
    query.skip = 1;
  }

  const species = await prisma.specie.findMany(query);

  res.send(species);
};

export default {
  summary,
  findAllLocations,
  findAllUsers,
  findAllPlants,
  findAllPhoto,
  findAllSpecie,
};
