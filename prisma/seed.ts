import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const tenants = [
  {
    name: "Elite Barber Studio",
    slug: "elite-barber-studio",
  },
  {
    name: "The Groom Room",
    slug: "the-groom-room",
  },
  {
    name: "Urban Cuts",
    slug: "urban-cuts",
  },
  {
    name: "Gentleman’s Lounge",
    slug: "gentlemans-lounge",
  },
];

async function main() {
  for (const tenant of tenants) {
    await prisma.tenant.upsert({
      where: {
        slug: tenant.slug,
      },
      update: {},
      create: tenant,
    });
  }

  console.log("✅ Tenants seeded successfully");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
