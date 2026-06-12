import { prisma } from "../src/index";

const MODELS = [
  { provider: "claude", model: "claude-sonnet-4-20250514", weight: 0.45 },
  { provider: "cursor", model: "gpt-4o", weight: 0.3 },
  { provider: "openai", model: "gpt-4o-mini", weight: 0.15 },
  { provider: "claude", model: "claude-haiku-3-5", weight: 0.1 },
];

const PROJECTS = ["usage-dashboard", "api-service", "mobile-app", "data-pipeline"];
const USERS = [
  { name: "Alex Chen", email: "alex@company.com" },
  { name: "Sam Rivera", email: "sam@company.com" },
  { name: "Jordan Lee", email: "jordan@company.com" },
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

async function main() {
  await prisma.usageLog.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all(
    USERS.map((u) => prisma.user.create({ data: u }))
  );

  const now = new Date();
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(12, 0, 0, 0);

    const logsPerDay = randomBetween(8, 24);
    let dayTokens = 0;
    let dayCost = 0;

    for (let i = 0; i < logsPerDay; i++) {
      const m = pickWeighted(MODELS);
      const tokensIn = randomBetween(500, 80000);
      const tokensOut = randomBetween(200, 40000);
      const cost = (tokensIn * 0.000003 + tokensOut * 0.000015) * (m.provider === "claude" ? 1.2 : 1);
      dayTokens += tokensIn + tokensOut;
      dayCost += cost;

      await prisma.usageLog.create({
        data: {
          provider: m.provider,
          model: m.model,
          tokensInput: tokensIn,
          tokensOutput: tokensOut,
          cost,
          projectName: PROJECTS[randomBetween(0, PROJECTS.length - 1)],
          userId: users[randomBetween(0, users.length - 1)].id,
          createdAt: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            randomBetween(8, 20),
            randomBetween(0, 59)
          ),
        },
      });
    }

    const reportDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    await prisma.dailyReport.upsert({
      where: { date: reportDate },
      create: {
        date: reportDate,
        totalTokens: dayTokens,
        totalCost: Math.round(dayCost * 100) / 100,
      },
      update: {
        totalTokens: dayTokens,
        totalCost: Math.round(dayCost * 100) / 100,
      },
    });
  }

  console.log("Seed complete:", users.length, "users, 30 days of usage");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
