import { Router } from 'express';
import user from './user.controller.js';
import multerUploader from '../middlewares/uploader.js';
import auth from '../middlewares/auth.js';
import parser from '../middlewares/parser.js';
import disk from '../middlewares/disk.js';

const router = Router();
const uploader = multerUploader();

router.post(
  '/',
  uploader.single('avatar'),
  disk.image('avatar'),
  user.register
);

router.get('/id/:id?', parser.integers({ id: true }), user.find);
router.put(
  '/',
  auth.self,
  uploader.single('avatar'),
  disk.image('avatar'),
  user.modify
);
router.delete('/:id', auth.admin, parser.integers({ id: true }), user.remove);

router.get('/password/requirements', user.passwordRequirements);
router.post('/password/check', user.checkPassword);
router.get('/usernamerequirements', user.usernameRequirements);
router.get('/username/:username?', user.find);

export default router;
