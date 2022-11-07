/**
 * Fills the database with the name of the species.
 * The CSV files from http://www.theplantlist.org/ are used as references.
 */
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const insertSpeciesNames = () => {
  const file = path.join(__dirname, '/res/species.csv');
  const readline = createInterface({ input: createReadStream(file) });
  let species = [];

  readline.on('line', (line) => {
    const parts = line.replace(/['"]+/g, '').split(',');
    let name = `${parts[4]} ${parts[6]}`;

    if (parts[7] && parts[8]) name += `${parts[7]} ${parts[8]}`;

    species.push({
      family: parts[2],
      name: name.toLowerCase()
    });
  });

  readline.on('close', async () => {
    let bulkCreate;

    console.log(`Inserting ${species.length} species in the database...`);

    while (species.length > 0) {
      const speciesPart = species.splice(0, 1000);

      try {
        bulkCreate = await prisma.specie.createMany({ data: speciesPart });
        console.log(`Inserted ${bulkCreate.count} species into the database`);
      } catch(err) {
        console.log(`Error when inserting the data: ${err}`);
      }
    }
  });
}


const insertSpeciesCommonNames = () => {
  const file = path.join(__dirname, '/res/commonnames.csv');
  const readline = createInterface({ input: createReadStream(file) });
  let species = [];
  let lines = 0;

  console.log('Reading list of species common names...');
  readline.on('line', (line) => {
    lines++;
    const parts = line.replace(/['"]+/g, '').split(',');

    if (parts.length === 2) {
      species.push({
        where: { name: parts[1] },
        data: { commonName: parts[0] }
      });
    }
  });

  readline.on('close', async () => {
    let count = 0;

    console.log(`Inserting ${species.length} species common names in the database...`);

    for (const specie of species) {
      try {
        await prisma.specie.updateMany(specie);
        count++;
      } catch(err) {
        console.log(err);
      }
    }

    console.log(`Inserted ${count} common names (of ${lines} in the file) into the species database`);
  });
}

insertSpeciesNames();
insertSpeciesCommonNames();