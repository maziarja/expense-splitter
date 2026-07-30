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

export async function createExpenseAction(
  groupId: string,
  input: CreateExpenseInput,
): Promise<ActionResult<Expense>> {
  await requireAuth();
  const data = createExpenseInputSchema.parse(input);
  return runAction(() => prismaDataAccess.createExpense(groupId, data));
}

export async function updateExpenseAction(
  groupId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<ActionResult<Expense>> {
  await requireAuth();
  const data = updateExpenseInputSchema.parse(input);
  return runAction(() =>
    prismaDataAccess.updateExpense(groupId, expenseId, data),
  );
}

export async function deleteExpenseAction(
  groupId: string,
  expenseId: string,
): Promise<ActionResult<void>> {
  await requireAuth();
  return runAction(() => prismaDataAccess.deleteExpense(groupId, expenseId));
}
