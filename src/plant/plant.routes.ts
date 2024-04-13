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
  auth.checkRelationship('location', 'locationId'),
  plant.create
);
router.get('/', auth.self, plant.find);
router.get(
  '/user/:userId',
  parser.number({ userId: true }, 'params'),
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
  '/',
  auth.self,
  auth.checkOwnership('plant'),
  auth.checkRelationship('location', 'locationId'),
  auth.checkRelationship('photo', 'coverId'),
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
  auth.checkOwnership('plant', true),
  parser.numbers({ id: true }, 'params'),
  plant.remove
);

export default router;
