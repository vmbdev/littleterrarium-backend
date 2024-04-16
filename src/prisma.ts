import { PrismaClient } from '@prisma/client';

import { plantService } from './plant/plant.service.js';
import { locationService } from './location/location.service.js';
import { photoService } from './photo/photo.service.js';
import { userService } from './user/user.service.js';
import { taskService } from './task/task.service.js';

const prisma = new PrismaClient({
  log: [
    // 'query',
    // 'info',
    'warn',
    'error',
  ],
});

const prismaExtended = prisma
  .$extends(plantService)
  .$extends(locationService)
  .$extends(photoService)
  .$extends(userService)
  .$extends(taskService);

export default prismaExtended;
