import { Router } from 'express';
import photo from '../controllers/photo.controller';
import multerUploader from '../middlewares/uploader';
import auth from '../middlewares/auth';
import disk from '../middlewares/disk';
import parser from '../middlewares/parser';

const router = Router();
const uploader = multerUploader();

router.post('/',
  auth.self,
  uploader.array('photo', 10),
  parser.integers({ plantId: true }),
  auth.checkRelationship('plant', 'plantId'),
  disk.gallery(),
  photo.create
);
router.get('/', auth.self, photo.find);
router.get('/plant/:plantId',
  parser.integers({ plantId: true }),
  photo.find
);
router.get('/:id', parser.integers({ id: true }), photo.findOne);
router.get('/:id/navigation', parser.integers({ id: true }), photo.getNavigation);
router.put('/',
  auth.self,
  auth.checkOwnership('photo'),
  auth.checkRelationship('plant', 'plantId'),
  parser.integers({ id: true }),
  photo.modify
);
router.delete('/:id', auth.self, auth.checkOwnership('photo'), parser.integers({ id: true }), photo.remove);

export default router;