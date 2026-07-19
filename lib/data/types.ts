import type { CurrencyCode } from "../splits/constants";
import type { Expense, Split, SplitType } from "../splits/schema";
import type { MemberBalance, SettlementSuggestion } from "../splits/balance";

export type { Expense, Split, SplitType };

export type Member = {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  email: string | null;
  avatarColor: string;
  deletedAt: string | null;
};

export type Settlement = {
  id: string;
  from: string; // Member id (payer)
  to: string; // Member id (recipient)
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number; // to the group's default currency, at settlement time
  date: string; // ISO 8601
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  currency: CurrencyCode; // group default; balances are computed in this
  createdAt: string; // ISO 8601
  members: Member[];
};

export type GroupDetail = Group & {
  expenses: Expense[];
  settlements: Settlement[];
  memberBalances: MemberBalance[];
  settlementSuggestions: SettlementSuggestion[];
};

export type GroupSummary = {
  id: string;
  name: string;
  currency: CurrencyCode;
  memberCount: number;
  expenseCount: number;
  memberBalances: MemberBalance[];
};

export type CreateGroupInput = {
  name: string;
  description?: string;
  currency: CurrencyCode;
};

export type UpdateGroupInput = CreateGroupInput;

export type AddMemberInput = {
  name: string;
  email?: string;
  avatarColor: string;
};

export type CreateExpenseInput = Omit<Expense, "id">;

export type UpdateExpenseInput = CreateExpenseInput;

export type CreateSettlementInput = Omit<Settlement, "id">;
