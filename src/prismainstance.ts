import { PrismaClient } from '@prisma/client';

import { plantExtension } from './plant/plant.model';

const prisma = new PrismaClient({
  log: [
    // 'query',
    // 'info',
    'warn',
    'error',
  ],
})

const prismaExtended = prisma.$extends(plantExtension);

export default prismaExtended;
