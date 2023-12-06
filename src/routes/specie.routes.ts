import { Router } from 'express';
import auth from '../middlewares/auth';
import parser from '../middlewares/parser';
import specie from '../controllers/specie.controller';

const router = Router();

router.post('/', auth.admin, specie.create);
router.get('/name/:name?', auth.self, specie.find);
router.get('/:id', auth.self, parser.integers({ id: true }), specie.findOne);
router.put('/', auth.admin, parser.integers({ id: true }), specie.modify);
router.delete('/:id', auth.admin, parser.integers({ id: true }), specie.remove);

export default router;
