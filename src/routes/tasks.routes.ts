import { Router } from 'express';
import auth from '../middlewares/auth.js';
import tasks from '../controllers/tasks.controller.js';

const router = Router();

router.get('/', auth.self, tasks.find);

export default router;
