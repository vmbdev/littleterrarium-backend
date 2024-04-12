import { Router } from 'express';

import userRoutes from './user/user.routes.js';
import authRoutes from './auth/auth.routes.js';
import locationRoutes from './location/location.routes.js';
import plantRoutes from './plant/plant.routes.js';
import specieRoutes from './specie/specie.routes.js';
import photoRoutes from './photo/photo.routes.js';
import tasksRoutes from './task/task.routes.js';
import adminRoutes from './admin/admin.routes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/plants', plantRoutes);
router.use('/species', specieRoutes);
router.use('/photos', photoRoutes);
router.use('/tasks', tasksRoutes);
router.use('/admin', adminRoutes);

export default router;
