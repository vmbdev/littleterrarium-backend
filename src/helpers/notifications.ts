import { NotificationType, Plant } from '@prisma/client';
import prisma from '../prismainstance';

const check = async () => {
  const plantsToWater = await checkProperty('waterNext');
  const plantsToFertilize = await checkProperty('fertNext');

  store(plantsToWater);
  store(plantsToFertilize);
}

const checkProperty = async (property: string): Promise<Plant[]> => {
  const plants: Plant[] = await prisma.plant.findMany({
    where: {
      [property]: {
        lte: new Date()
      }
    },
    // select: {
    //   id: true,
    //   ownerId: true,
    //   [property]: true
    // }
  })

  return plants;
}

const store = async (plants: Plant[]) => {
  for (const plant of plants) {
    const content: any = {};
    let type;

    if (plant.waterNext) content.waterNext = plant.waterNext;
    else if (plant.fertNext) content.fertNext = plant.fertNext;
    
    type = content.waterNext ? NotificationType.WATER : NotificationType.FERTILIZER;

    await prisma.notification.upsert({
      where: {
        plantCare: {
          plantId: plant.id,
          type
        }
      },
      update: { content },
      create: {
        plantId: plant.id,
        ownerId: plant.ownerId,
        content,
        type
      }
    });

    // if (existingNotif)
  }
}

export default {
  check
}