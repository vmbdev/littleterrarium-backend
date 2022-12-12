import { Router } from 'express';
import location from '../controllers/location.controller';
import multerUploader from '../middlewares/uploader';
import auth from '../middlewares/auth';
import disk from '../middlewares/disk';
import parser from '../middlewares/parser';

const router = Router();
const uploader = multerUploader();

router.post('/', auth.self, uploader.single('picture'), disk.image('location'), location.create);
router.get('/', auth.self, location.find);
router.get('/user/:userId', parser.integers({ userId: true }), location.find);
router.get('/:id', parser.integers({ id: true }), location.findOne);
router.put('/',
  auth.self,
  uploader.single('picture'),
  auth.checkOwnership('location'),
  parser.integers({ id: true }),
  disk.image('location'),
  location.modify
);
router.delete('/:id', auth.self, auth.checkOwnership('location'), parser.integers({ id: true }), location.remove);

export default router;