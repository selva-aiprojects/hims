const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  try {
    console.log("Fetching a ticket...");
    const tickets = await prisma.$queryRawUnsafe(`SELECT id FROM nexus.support_tickets LIMIT 1`);
    if (tickets.length === 0) {
      console.log("No tickets found to test.");
      return;
    }
    const id = tickets[0].id;
    console.log(`Testing update for ticket: ${id}`);
    
    const result = await prisma.$queryRawUnsafe(`
      UPDATE nexus.support_tickets 
      SET status = 'In Progress', updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *
    `, id);
    
    console.log("Update Result:", result);
  } catch (err) {
    console.error("Test Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
