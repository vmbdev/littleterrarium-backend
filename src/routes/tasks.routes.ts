import { Router } from 'express';
import auth from '../middlewares/auth';
import tasks from '../controllers/tasks.controller';

const router = Router();

router.get('/', auth.self, tasks.find);

export default router;