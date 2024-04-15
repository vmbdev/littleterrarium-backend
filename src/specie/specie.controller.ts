import { RequestHandler } from 'express';
import { LTRes } from '../helpers/ltres.js';
import prisma from '../prisma.js';

const create: RequestHandler = async (req, res, next) => {
  const requiredFields = ['family', 'name'];
  const optionalFields = ['commonName', 'care'];
  const data: any = {};

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(LTRes.msg('MISSING_FIELD').errorField(field));
    } else data[field] = req.body[field];
  }

  for (const field of optionalFields) {
    if (req.body[field]) {
      if (field === 'care') {
        try {
          data.care = JSON.parse(req.body.care);
        } catch (err) {
          return next(LTRes.msg('SPECIE_CARE_NOT_VALID'));
        }
      } else data[field] = req.body[field];
    }
  }

  try {
    await prisma.specie.create({ data });
    res.send(LTRes.msg('SPECIE_CREATED'));
  } catch (e) {
    next(LTRes.createCode(500));
  }
};

const findByName: RequestHandler = async (req, res, next) => {
  if (!req.params.name) return next(LTRes.msg('SPECIE_NAME_NOT_VALID'));

  const name = req.params.name.toLowerCase();
  const species = await prisma.specie.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      commonName: true,
    },
    where: {
      name: {
        contains: name,
      },
    },
  });

  res.send(species);
};

const findOne: RequestHandler = async (req, res, next) => {
  const specie = await prisma.specie.findUnique({
    where: { id: req.parser.id },
  });

  if (specie) res.send(specie);
  else next(LTRes.msg('SPECIE_NOT_VALID'));
};

const modify: RequestHandler = async (req, res, next) => {
  const data: any = {};
  const fields = ['family', 'name', 'commonName', 'care'];

  for (const field of Object.keys(req.body)) {
    if (fields.includes(field)) {
      if (field === 'care') {
        try {
          data.care = JSON.parse(req.body.care);
        } catch (err) {
          return next(LTRes.msg('SPECIE_CARE_NOT_VALID'));
        }
      } else data[field] = req.body[field];
    }
  }

  try {
    await prisma.specie.update({ where: { id: req.parser.id }, data });
    res.send(LTRes.msg('SPECIE_UPDATED'));
  } catch (err) {
    next(LTRes.msg('SPECIE_NOT_VALID'));
  }
};

const remove: RequestHandler = async (req, res, next) => {
  try {
    await prisma.specie.delete({ where: { id: req.parser.id } });
    res.send(LTRes.msg('SPECIE_REMOVED'));
  } catch (err) {
    next(LTRes.msg('SPECIE_NOT_VALID'));
  }
};

export default {
  create,
  findByName,
  findOne,
  modify,
  remove,
};
