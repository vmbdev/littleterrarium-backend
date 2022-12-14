import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prismainstance";

const create: RequestHandler =  async (req, res, next) => {
  const requiredFields = ['family', 'name'];
  const optionalFields = ['commonName', 'care'];
  const data: any = {};

  for (const field of requiredFields) {
    if (!req.body[field]) return next({ error: 'MISSING_FIELD', data: { field } });
    else data[field] = req.body[field];
  }

  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'care') {
        try {
          data.care = JSON.parse(req.body.care);
        } catch (err) {
          return next({ error: 'SPECIE_CARE_NOT_VALID' });
        }
      }
      else data[field] = req.body[field];
    }
  }

  try {
    await prisma.specie.create({ data });
    res.send({ msg: 'SPECIE_CREATED' });
  } catch (e) {
    next({ code: 500 });
  }
}

const find: RequestHandler = async (req, res, next) => {
  if (!req.params.name) return next({ error: 'SPECIE_NAME_NOT_VALID' });

  const name = req.params.name.toLowerCase();
  const plants = await prisma.specie.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      commonName: true
    },
    where: {
      name: {
        contains: name
      }
    }
  });

  res.send(plants);
}

const findOne: RequestHandler = async (req, res, next) => {
  const plant = await prisma.specie.findUnique({ where: { id: req.parser.id } });

  if (plant) res.send(plant);
  else next({ error: 'SPECIE_NOT_VALID' });
}

const modify: RequestHandler = async (req, res, next) => {
  const data: any = {};
  const fields = ['family', 'name', 'commonName', 'care'];

  for (const field of Object.keys(req.body)) {
    if (fields.includes(field)) {
      if (field === 'care') {
        try {
          data.care = JSON.parse(req.body.care);
        } catch (err) {
          return next({ error: 'SPECIE_CARE_NOT_VALID' });
        }
      }
      else data[field] = req.body[field];
    }
  }

  try {
    await prisma.specie.update({ where: { id: req.parser.id }, data });
    res.send({ msg: 'SPECIE_UPDATED' });
  } catch (err) {
    next({ error: 'SPECIE_NOT_VALID' });
  }
}

const remove: RequestHandler = async (req, res, next) => {
  try {
    await prisma.specie.delete({ where: { id: req.parser.id } });
    res.send({ msg: 'SPECIE_REMOVED' });
  } catch (err) {
    next({ error: 'SPECIE_NOT_VALID' });
  }
}

export default {
  create,
  find,
  findOne,
  modify,
  remove
};