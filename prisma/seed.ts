import { PrismaClient } from '@prisma/client'
import Password from '../src/helpers/password';

const prisma = new PrismaClient()

async function main() {
  await prisma.user.create({
    data: {
      username: 'admin',
      password: await Password.hash('admin123'),
      email: 'admin@admin.com'
    }
  });
  
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })