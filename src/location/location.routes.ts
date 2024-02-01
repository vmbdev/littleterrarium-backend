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
router.get('/user/:userId', parser.integers({ userId: true }), location.find);
router.get('/:id', parser.integers({ id: true }), location.findOne);
router.get('/:id/plants', parser.integers({ id: true }), location.findPlants);
router.get(
  '/:id/plants/count',
  parser.integers({ id: true }),
  location.getPlantsCount
);
router.put(
  '/',
  auth.self,
  uploader.single('picture'),
  auth.checkOwnership('location'),
  parser.integers({ id: true }),
  disk.image('location'),
  location.modify
);
router.delete(
  '/:id',
  auth.self,
  auth.checkOwnership('location'),
  parser.integers({ id: true }),
  location.remove
);

export default router;
