import { Router } from 'express';
import userRoutes from './user.routes';
import locationRoutes from './location.routes';
import plantRoutes from './plant.routes';
import specieRoutes from './specie.routes';
import photoRoutes from './photo.routes';
import tasksRoutes from './tasks.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/plants', plantRoutes);
router.use('/species', specieRoutes);
router.use('/photos', photoRoutes);
router.use('/tasks', tasksRoutes);

export default router;
