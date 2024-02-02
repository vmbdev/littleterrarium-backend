import { Router } from 'express';
import authController from './auth.controller.js';

const router = Router();

router.get('/', authController.find);
router.post('/signin', authController.signin);
router.post('/logout', authController.logout);
router.post('/forgotten', authController.forgottenPassword);
router.post('/restore', authController.restore);
router.post('/verifytoken', authController.verifyToken);

export default router;
