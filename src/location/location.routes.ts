import { Router } from 'express';

import location from './location.controller.js';
import multerUploader from '../middlewares/uploader.js';
import auth from '../middlewares/auth.js';
import disk from '../middlewares/disk.js';
import parser from '../middlewares/parser.js';

const router = Router();
const uploader = multerUploader();

router.post(
  '/',
  auth.self,
  uploader.single('picture'),
  disk.image('location'),
  location.create
);
router.get('/', auth.self, location.find);
router.get(
  '/user/:userId',
  parser.number({ userId: true }, 'params'),
  location.find
);
router.get('/:id', parser.number({ id: true }, 'params'), location.findOne);
router.get(
  '/:id/plants',
  parser.number({ id: true }, 'params'),
  parser.number({ offset: false, limit: false }, 'query'),
  location.findPlants
);
router.get(
  '/:id/plants/count',
  parser.number({ id: false }, 'params'),
  location.getPlantsCount
);
router.patch(
  '/',
  auth.self,
  uploader.single('picture'),
  auth.checkOwnership('location', 'body'),
  parser.number({ id: true }, 'body'),
  disk.image('location'),
  location.modify
);
router.delete(
  '/:id',
  auth.self,
  auth.checkOwnership('location', 'params'),
  parser.number({ id: true }, 'params'),
  location.remove
);

export default router;
