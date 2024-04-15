import { Router } from 'express';
import auth from '../middlewares/auth.js';
import parser from '../middlewares/parser.js';
import specie from './specie.controller.js';

const router = Router();

router.post('/', auth.admin, specie.create);
router.get('/name/:name?', auth.self, specie.findByName);
router.get(
  '/:id',
  auth.self,
  parser.number({ id: true }, 'params'),
  specie.findOne
);
router.patch('/', auth.admin, parser.number({ id: true }, 'body'), specie.modify);
router.delete(
  '/:id',
  auth.admin,
  parser.number({ id: true }, 'params'),
  specie.remove
);

export default router;
