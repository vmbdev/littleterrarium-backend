import { Router } from 'express';

import authController from './auth.controller.js';
import auth from '../middlewares/auth.js';
import parser from '../middlewares/parser.js';

const router = Router();

router.get('/', auth.self, authController.checkAuth);
router.post('/signin', authController.signin);
router.post('/logout', authController.logout);
router.post('/forgotten', authController.forgottenPassword);
router.post(
  '/restore',
  parser.number({ userId: true }, 'body'),
  authController.restore
);
router.post(
  '/verifytoken',
  parser.number({ userId: true }, 'body'),
  authController.verifyToken
);

export default router;
