import { Router } from 'express';
import user from '../controllers/user.controller';
import multerUploader from '../middlewares/uploader';
import auth from '../middlewares/auth';
import parser from '../middlewares/parser';
import disk from '../middlewares/disk';

const router = Router();
const uploader = multerUploader();

router.post('/', uploader.single('avatar'), disk.image('avatar'), user.register);
router.get('/id/:id?', parser.integers({ id: true }), user.findById);
router.put('/', auth.self,  uploader.single('avatar'), disk.image('avatar'), user.modify);
router.delete('/:id', auth.admin, user.remove);
router.post('/signin', user.signin);
router.get('/logout', user.logout);
router.post('/restore', user.restore);
router.get('/validate/:key', user.verify);
router.get('/password/requirements', user.passwordRequirements);
router.post('/password/check', user.checkPassword)
router.get('/:username?', user.find);

export default router;