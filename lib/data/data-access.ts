import { z } from "zod";
import {
  currencyCodeSchema,
  expenseBaseSchema,
  refineExpenseSplits,
} from "../splits/schema";
import type {
  AddMemberInput,
  CreateExpenseInput,
  CreateGroupInput,
  CreateSettlementInput,
  Expense,
  Group,
  GroupDetail,
  GroupSummary,
  Member,
  Settlement,
  UpdateExpenseInput,
  UpdateGroupInput,
} from "./types";

export const createGroupInputSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  currency: currencyCodeSchema,
});

export const updateGroupInputSchema = createGroupInputSchema;

export const addMemberInputSchema = z.object({
  name: z.string().min(1),
  email: z.email().optional(),
  avatarColor: z.string().min(1),
});

export const createExpenseInputSchema = expenseBaseSchema
  .omit({ id: true })
  .superRefine(refineExpenseSplits);

export const updateExpenseInputSchema = createExpenseInputSchema;

export const createSettlementInputSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    amount: z.number().positive(),
    currency: currencyCodeSchema,
    exchangeRate: z.number().positive(),
    date: z.iso.datetime(),
  })
  .refine((settlement) => settlement.from !== settlement.to, {
    message: "A member can't settle up with themselves",
    path: ["to"],
  });

export type DataAccessErrorCode =
  | "GROUP_NOT_FOUND"
  | "MEMBER_NOT_FOUND"
  | "EXPENSE_NOT_FOUND"
  | "MEMBER_HAS_BALANCE"
  | "GROUP_NOT_SETTLED"
  | "NO_DEBT_EXISTS";

export class DataAccessError extends Error {
  constructor(
    message: string,
    public readonly code: DataAccessErrorCode,
  ) {
    super(message);
    this.name = "DataAccessError";
  }
}

export type DataAccess = {
  listGroups(): Promise<GroupSummary[]>;
  getGroup(groupId: string): Promise<GroupDetail | null>;
  createGroup(input: CreateGroupInput): Promise<Group>;
  updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;

  addMember(groupId: string, input: AddMemberInput): Promise<Member>;
  removeMember(groupId: string, memberId: string): Promise<void>;

  listExpenses(groupId: string): Promise<Expense[]>;
  getExpense(groupId: string, expenseId: string): Promise<Expense | null>;
  createExpense(groupId: string, input: CreateExpenseInput): Promise<Expense>;
  updateExpense(
    groupId: string,
    expenseId: string,
    input: UpdateExpenseInput,
  ): Promise<Expense>;
  deleteExpense(groupId: string, expenseId: string): Promise<void>;

  listSettlements(groupId: string): Promise<Settlement[]>;
  createSettlement(
    groupId: string,
    input: CreateSettlementInput,
  ): Promise<Settlement>;
};
