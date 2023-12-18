/**
 * Fills the database with the name of the species.
 */
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Creates the list of species in the database.
 * The classification.csv file from
 * https://wfoplantlist.org/plant-list/classifications is used as a reference. 
 */
const insertSpecies = async () => {
  const parser = createReadStream(`${__dirname}/res/classification.csv`).pipe(
    parse({
      columns: true,
      delimiter: '\t',
    })
  );
  let count = 0;

  for await (const record of parser) {
    const specie = {
      family: record.family,
      name: record.scientificName.toLowerCase(),
    };

    /**
     * This is horribly slow, but prisma doesn't have a upsertMany option yet,
     * so we have to do it to not damage the previous plants with species
     */
    try {
      await prisma.specie.upsert({
        where: {
          name: specie.name,
        },
        update: {
          family: specie.family,
        },
        create: {
          name: specie.name,
          family: specie.family,
        },
      });
    } catch (err) {
      console.log(`Error when inserting the data: ${err}`);
    }

    if (count % 1000 === 0) {
      console.log(`Inserted ${count} species into the database`);
      process.stdout.moveCursor(0, -1);
    }

    count++;
  }

  process.stdout.moveCursor(0, 1);
};

/**
 * Updates the species with a list of common names. A default commonnames.csv
 * is provided.
 */
const insertSpeciesCommonNames = async () => {
  const parser = createReadStream(`${__dirname}/res/commonnames.csv`).pipe(
    parse({
      columns: true,
      delimiter: '\t',
    })
  );
  const species: any = [];

  console.log(
    `Inserting ${species.length} species common names in the database...`
  );

  let count = 0;
  for await (const record of parser) {
    if (record.commonName && record.scientificName) {
      try {
        await prisma.specie.update({
          where: { name: record.scientificName.toLowerCase() },
          data: { commonName: record.commonName },
        });
        count++;
      } catch (err) {}
    }
  }

  console.log(`Inserted ${count} common names.`);
};

(async () => {
  await insertSpecies();
  await insertSpeciesCommonNames();

  console.log('Done!');
})();
