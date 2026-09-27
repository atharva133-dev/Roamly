const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ 
  datasources: { db: { url: "postgresql://postgres:ryuma@127.0.0.1:5432/globetrotter?schema=public" } }
});
async function main() {
  try {
    const user = await prisma.user.findFirst();
    console.log("Success with 127.0.0.1:", user);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
