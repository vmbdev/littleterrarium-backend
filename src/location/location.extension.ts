import { Prisma } from '@prisma/client';

import prisma from '../prisma';

export const locationExtension = Prisma.defineExtension({
  name: 'location',
  model: {
    location: {

    }
  }
});