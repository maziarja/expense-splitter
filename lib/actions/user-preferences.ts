"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currencyCodeSchema } from "@/lib/splits/schema";

const updateUserPreferenceInputSchema = z.object({
  defaultCurrency: currencyCodeSchema,
  notificationsEnabled: z.boolean(),
});

export async function updateUserPreference(
  input: z.infer<typeof updateUserPreferenceInputSchema>,
) {
  const session = await requireAuth();
  const data = updateUserPreferenceInputSchema.parse(input);

  await prisma.userPreference.update({
    where: { userId: session.user.id },
    data,
  });

  revalidatePath("/account");
}
