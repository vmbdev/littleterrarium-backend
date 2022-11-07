import { Router } from 'express';
import user from '../controllers/user.controller';
import auth from '../middlewares/auth';
import parser from '../middlewares/parser';

const router = Router();

router.post('/', user.register);
router.get('/id/:id?', parser.integers({ id: true }), user.findById);
router.put('/', auth.self, user.modify);
router.delete('/:id', auth.admin, user.remove);
router.post('/signin', user.signin);
router.get('/logout', user.logout);
router.post('/restore', user.restore);
router.get('/validate/:key', user.verify);
router.get('/password/requirements', user.passwordRequirements);
router.post('/password/check', user.checkPassword)
router.get('/:username?', user.find);

export default router;