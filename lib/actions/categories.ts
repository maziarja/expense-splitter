"use server";

import { requireAuth } from "@/lib/auth";
import { createCategoryInputSchema } from "@/lib/data/data-access";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";
import type { Category, CreateCategoryInput } from "@/lib/data/types";
import { runAction, type ActionResult } from "./action-result";
import { revalidateDashboard } from "./revalidate-dashboard";

export async function createCategoryAction(
  groupId: string,
  input: CreateCategoryInput,
): Promise<ActionResult<Category>> {
  await requireAuth();
  const data = createCategoryInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.createCategory(groupId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}
