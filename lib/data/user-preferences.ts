import { prisma } from "@/lib/prisma";
import type { CurrencyCode } from "@/lib/splits/constants";

export async function getUserPreference(userId: string) {
  const preference = await prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, defaultCurrency: "USD" },
  });

  return {
    ...preference,
    defaultCurrency: preference.defaultCurrency as CurrencyCode,
  };
}
