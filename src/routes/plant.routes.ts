import { RequestHandler, Router } from 'express';
import auth from '../middlewares/auth';
import parser from '../middlewares/parser';
import plant from '../controllers/plant.controller';

const router = Router();

router.post('/', 
  auth.self,
  parser.integers({
    locationId: true,
    specieId: false,
    waterFreq: false,
    fertFreq: false,
    potSize: false,
  }),
  auth.checkRelationship('location', 'locationId'),
  plant.create
);
router.get('/', auth.self, plant.find);
router.get('/user/:userId', parser.integers({ userId: true }), plant.find);
router.get('/user/:userId/location/:locationId', parser.integers({ userId: true, locationId: true }), plant.find);
router.get('/location/:locationId', parser.integers({ locationId: true }), plant.find);
router.get('/:id?', parser.integers({ id: false }), plant.findOne);
router.put('/',
  auth.self,
  auth.checkOwnership('plant'),
  auth.checkRelationship('location', 'locationId'),
  parser.integers({
    id: true,
    locationId: false,
    specieId: false,
    waterFreq: false,
    fertFreq: false,
    potSize: false,
  }),
  plant.modify
);
router.delete('/:id', auth.self, auth.checkOwnership('plant'), parser.integers({ id: true }), plant.remove);

export default router;