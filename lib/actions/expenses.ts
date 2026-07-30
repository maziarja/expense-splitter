"use server";

import { requireAuth } from "@/lib/auth";
import {
  createExpenseInputSchema,
  updateExpenseInputSchema,
} from "@/lib/data/data-access";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";
import type {
  CreateExpenseInput,
  Expense,
  UpdateExpenseInput,
} from "@/lib/data/types";
import { runAction, type ActionResult } from "./action-result";
import { revalidateDashboard } from "./revalidate-dashboard";

export async function createExpenseAction(
  groupId: string,
  input: CreateExpenseInput,
): Promise<ActionResult<Expense>> {
  await requireAuth();
  const data = createExpenseInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.createExpense(groupId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}

export async function updateExpenseAction(
  groupId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<ActionResult<Expense>> {
  await requireAuth();
  const data = updateExpenseInputSchema.parse(input);
  const result = await runAction(() =>
    prismaDataAccess.updateExpense(groupId, expenseId, data),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}

export async function deleteExpenseAction(
  groupId: string,
  expenseId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  const result = await runAction(() =>
    prismaDataAccess.deleteExpense(groupId, expenseId),
  );
  if (result.ok) revalidateDashboard(groupId);
  return result;
}
