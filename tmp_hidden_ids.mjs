import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });
const { prisma } = await import("./src/lib/prisma.ts");
const hidden = await prisma.tutorProfile.findMany({
  where: { active: false },
  select: { id: true, user: { select: { name: true } } },
});
console.log(JSON.stringify(hidden, null, 2));
await prisma.$disconnect();
