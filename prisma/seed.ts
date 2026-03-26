import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "sandro@admin.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.client.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`Admin already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.client.create({
    data: {
      name: "Sandro (Admin)",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      maxMessagesPerMinute: 5,
      sendWindowStart: "08:00",
      sendWindowEnd: "20:00",
    },
  });

  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
