import { Router } from 'express';
import auth from '../middlewares/auth.js';
import parser from '../middlewares/parser.js';
import plant from './plant.controller.js';

const router = Router();

router.post(
  '/',
  auth.self,
  parser.number(
    {
      locationId: true,
      specieId: false,
      waterFreq: false,
      fertFreq: false,
      potSize: false,
    },
    'body'
  ),
  auth.checkRelationship('location', 'locationId', 'body'),
  plant.create
);
router.get(
  '/',
  auth.self,
  parser.number({ cursor: false, limit: false }, 'query'),
  plant.find
);
router.get(
  '/user/:userId',
  parser.number({ userId: true }, 'params'),
  parser.number({ cursor: false, limit: false }, 'query'),
  plant.find
);
router.get('/count', plant.getCount);
router.get('/:id', parser.number({ id: false }, 'params'), plant.findOne);
router.get(
  '/:id/photos',
  parser.number({ id: true }, 'params'),
  plant.getPhotos
);
router.get('/:id/cover', parser.number({ id: true }, 'params'), plant.getCover);
router.patch(
  '/:id/location/:locationId',
  auth.self,
  auth.checkOwnership('plant', 'params', true),
  auth.checkRelationship('location', 'locationId', 'params'),
  parser.numbers({ id: true }, 'params'),
  parser.number({ locationId: true }, 'params'),
  plant.moveLocation
)
router.patch(
  '/',
  auth.self,
  auth.checkOwnership('plant', 'body'),
  auth.checkRelationship('location', 'locationId', 'body'),
  auth.checkRelationship('photo', 'coverId', 'body'),
  parser.number(
    {
      id: true,
      locationId: false,
      specieId: false,
      coverId: false,
      waterFreq: false,
      fertFreq: false,
      potSize: false,
    },
    'body'
  ),
  plant.modify
);
router.delete(
  '/:id',
  auth.self,
  auth.checkOwnership('plant', 'params', true),
  parser.numbers({ id: true }, 'params'),
  plant.remove
);

export default router;
