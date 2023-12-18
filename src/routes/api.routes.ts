import { Router } from 'express';
import userRoutes from './user.routes.js';
import locationRoutes from './location.routes.js';
import plantRoutes from './plant.routes.js';
import specieRoutes from './specie.routes.js';
import photoRoutes from './photo.routes.js';
import tasksRoutes from './tasks.routes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/plants', plantRoutes);
router.use('/species', specieRoutes);
router.use('/photos', photoRoutes);
router.use('/tasks', tasksRoutes);

export default router;
