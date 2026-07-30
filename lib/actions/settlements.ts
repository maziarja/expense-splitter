"use server";

import { requireAuth } from "@/lib/auth";
import { createSettlementInputSchema } from "@/lib/data/data-access";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";
import type { CreateSettlementInput, Settlement } from "@/lib/data/types";
import { runAction, type ActionResult } from "./action-result";
import { revalidateDashboard } from "./revalidate-dashboard";

export async function createSettlementAction(
  groupId: string,
  input: CreateSettlementInput,
): Promise<ActionResult<Settlement>> {
  await requireAuth();
  const data = createSettlementInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.createSettlement(groupId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}
