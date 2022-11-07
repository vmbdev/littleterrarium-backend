import { Router } from 'express';
import userRoutes from './user.routes';
import locationRoutes from './location.routes';
import plantRoutes from './plant.routes';
import specieRoutes from './specie.routes';
import photoRoutes from './photo.routes';
import tasksRoutes from './tasks.routes';

const router = Router();

router.use('/user', userRoutes);
router.use('/location', locationRoutes);
router.use('/plant', plantRoutes);
router.use('/specie', specieRoutes);
router.use('/photo', photoRoutes);
router.use('/tasks', tasksRoutes);

export default router;