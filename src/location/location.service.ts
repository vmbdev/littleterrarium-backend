import { Prisma } from '@prisma/client';

// import prisma from '../prisma';

export const locationService = Prisma.defineExtension({
  name: 'location',
  model: {
    location: {

    }
  }
});