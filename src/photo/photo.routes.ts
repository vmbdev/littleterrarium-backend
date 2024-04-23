import { Router } from 'express';

import photo from './photo.controller.js';
import multerUploader from '../middlewares/uploader.js';
import auth from '../middlewares/auth.js';
import disk from '../middlewares/disk.js';
import parser from '../middlewares/parser.js';

const router = Router();
const uploader = multerUploader();

router.post(
  '/',
  auth.self,
  uploader.array('photo', 10),
  parser.number({ plantId: true }, 'body'),
  auth.checkRelationship('plant', 'plantId', 'body'),
  disk.gallery(),
  photo.create
);
router.get('/:id', parser.number({ id: true }, 'params'), photo.findOne);
router.get(
  '/:id/navigation',
  parser.number({ id: true }, 'params'),
  photo.getNavigation
);
router.patch(
  '/',
  auth.self,
  auth.checkOwnership('photo', 'body'),
  auth.checkRelationship('plant', 'plantId', 'body'),
  parser.number({ id: true }, 'body'),
  photo.modify
);
router.delete(
  '/:id',
  auth.self,
  auth.checkOwnership('photo', 'params'),
  parser.number({ id: true }, 'params'),
  photo.remove
);

export default router;
