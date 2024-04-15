import { PrismaClient } from '@prisma/client';

import { plantExtension } from './plant/plant.extension';
import { locationExtension } from './location/location.extension';
import { taskExtension } from './task/task.extension';
import { photoExtension } from './photo/photo.extension';

const prisma = new PrismaClient({
  log: [
    // 'query',
    // 'info',
    'warn',
    'error',
  ],
});

const prismaExtended = prisma
  .$extends(plantExtension)
  .$extends(locationExtension)
  .$extends(photoExtension)
  .$extends(taskExtension);

export default prismaExtended;
