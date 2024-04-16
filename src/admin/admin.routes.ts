import { Router } from 'express';

import auth from '../middlewares/auth.js';
import admin from './admin.controller.js';

const router = Router();

router.get('/', auth.admin, admin.summary);
router.get('/location', auth.admin, admin.findAllLocations);
router.get('/user', auth.admin, admin.findAllUsers);
router.get('/plant', auth.admin, admin.findAllPlants);
router.get('/photo', auth.admin, admin.findAllPhoto);
router.get('/specie', auth.admin, admin.findAllSpecie);

export default router;
