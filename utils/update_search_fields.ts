import { Plant, Prisma, PrismaPromise } from '@prisma/client';
import prisma from '../src/prismainstance';
import { prepareForSortName } from '../src/helpers/textparser';

const main = async (): Promise<number> => {
  const plantsToUpdate: PrismaPromise<Plant>[] = [];
  const plants = await prisma.plant.findMany({
    include: { specie: true },
  });

  for (const plant of plants) {
    let sortName: string | null;

    if (plant.customName) sortName = prepareForSortName(plant.customName);
    else if (plant.specie?.name) sortName = plant.specie.name.toLowerCase();
    else sortName = null;

    if (sortName) {
      const updateQuery: Prisma.PlantUpdateArgs = {
        where: { id: plant.id },
        data: { sortName: sortName },
      };
      plantsToUpdate.push(prisma.plant.update(updateQuery));
    }
  }

  if (plantsToUpdate.length > 0) {
    await prisma.$transaction(plantsToUpdate);
  }

  return plantsToUpdate.length;
};

main().then((res: number) => {
  console.log(`Updated plants: ${res}`);
});
