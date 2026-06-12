export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

export function toRfc3339(d: Date) {
  return d.toISOString();
}

export function daysAgo(n: number) {
  const d = startOfDay(new Date());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export async function upsertUser(email: string, name?: string) {
  const { prisma } = await import("@repo/db");
  return prisma.user.upsert({
    where: { email },
    create: { email, name: name ?? email.split("@")[0] },
    update: { name: name ?? undefined },
  });
}
