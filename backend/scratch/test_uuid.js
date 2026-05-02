const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const res = await prisma.$queryRawUnsafe('SELECT gen_random_uuid()');
    console.log('gen_random_uuid() works:', res[0]);
  } catch (err) {
    console.error('gen_random_uuid() FAILED:', err.message);
    try {
      const res2 = await prisma.$queryRawUnsafe('SELECT uuid_generate_v4()');
      console.log('uuid_generate_v4() works:', res2[0]);
    } catch (err2) {
      console.error('uuid_generate_v4() FAILED:', err2.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
