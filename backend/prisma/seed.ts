import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Lower cost keeps dev login/snappy; bcrypt.compare scales with stored cost. */
const DEMO_BCRYPT_ROUNDS = 8;

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", DEMO_BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@smartseason.local" },
    update: { passwordHash },
    create: {
      email: "admin@smartseason.local",
      passwordHash,
      name: "Alex Coordinator",
      role: "ADMIN",
    },
  });

  const agentA = await prisma.user.upsert({
    where: { email: "agent1@smartseason.local" },
    update: { passwordHash },
    create: {
      email: "agent1@smartseason.local",
      passwordHash,
      name: "Jamie Fields",
      role: "FIELD_AGENT",
    },
  });

  const agentB = await prisma.user.upsert({
    where: { email: "agent2@smartseason.local" },
    update: { passwordHash },
    create: {
      email: "agent2@smartseason.local",
      passwordHash,
      name: "Riley Brooks",
      role: "FIELD_AGENT",
    },
  });

  const fields = [
    {
      name: "North Ridge",
      cropType: "Maize",
      plantingDate: new Date("2026-01-10"),
      currentStage: "GROWING",
      assignedAgentId: agentA.id,
    },
    {
      name: "Riverbend Plot",
      cropType: "Beans",
      plantingDate: new Date("2025-11-20"),
      currentStage: "READY",
      assignedAgentId: agentA.id,
    },
    {
      name: "East Orchard",
      cropType: "Tomatoes",
      plantingDate: new Date("2026-02-01"),
      currentStage: "PLANTED",
      assignedAgentId: agentB.id,
    },
    {
      name: "Hillside Demo",
      cropType: "Kale",
      plantingDate: new Date("2025-08-01"),
      currentStage: "HARVESTED",
      assignedAgentId: agentB.id,
    },
  ];

  for (const f of fields) {
    const existing = await prisma.field.findFirst({ where: { name: f.name } });
    if (existing) continue;
    const field = await prisma.field.create({ data: f });
    await prisma.fieldUpdate.create({
      data: {
        fieldId: field.id,
        authorId: f.assignedAgentId ?? admin.id,
        stage: f.currentStage,
        note: "Initial season check-in from seed data.",
      },
    });
  }

  console.log("Seed complete.", { admin: admin.email, agents: [agentA.email, agentB.email] });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
