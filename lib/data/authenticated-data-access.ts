"use client";

import { unwrapActionResult } from "@/lib/actions/action-result";
import { createCategoryAction } from "@/lib/actions/categories";
import {
  addMemberAction,
  createGroupAction,
  deleteGroupAction,
  removeMemberAction,
  updateGroupAction,
} from "@/lib/actions/groups";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/lib/actions/expenses";
import { createSettlementAction } from "@/lib/actions/settlements";
import type { DataAccess } from "./data-access";

const READ_ERROR =
  "authenticatedDataAccess doesn't support reads — the dashboard reads via Server Components instead.";

export const authenticatedDataAccess: DataAccess = {
  async listGroups() {
    throw new Error(READ_ERROR);
  },
  async getGroup() {
    throw new Error(READ_ERROR);
  },
  async createGroup(input) {
    return unwrapActionResult(await createGroupAction(input));
  },
  async updateGroup(groupId, input) {
    return unwrapActionResult(await updateGroupAction(groupId, input));
  },
  async deleteGroup(groupId) {
    return unwrapActionResult(await deleteGroupAction(groupId));
  },

  async addMember(groupId, input) {
    return unwrapActionResult(await addMemberAction(groupId, input));
  },
  async removeMember(groupId, memberId) {
    return unwrapActionResult(await removeMemberAction(groupId, memberId));
  },

  async listExpenses() {
    throw new Error(READ_ERROR);
  },
  async getExpense() {
    throw new Error(READ_ERROR);
  },
  async createExpense(groupId, input) {
    return unwrapActionResult(await createExpenseAction(groupId, input));
  },
  async updateExpense(groupId, expenseId, input) {
    return unwrapActionResult(
      await updateExpenseAction(groupId, expenseId, input),
    );
  },
  async deleteExpense(groupId, expenseId) {
    return unwrapActionResult(await deleteExpenseAction(groupId, expenseId));
  },

  async listSettlements() {
    throw new Error(READ_ERROR);
  },
  async createSettlement(groupId, input) {
    return unwrapActionResult(await createSettlementAction(groupId, input));
  },

  async createCategory(groupId, input) {
    return unwrapActionResult(await createCategoryAction(groupId, input));
  },
};
