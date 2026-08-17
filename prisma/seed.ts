import { seedCompanyData } from "../src/lib/seed-company";
import { prisma } from "../src/lib/prisma";

async function main() {
  const accounts = await seedCompanyData();
  console.log("Seed complete.");
  for (const a of accounts) {
    console.log(`${a.role}: ${a.email} / ${a.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
