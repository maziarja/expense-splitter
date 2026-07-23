import { calculateBalances } from "../splits/balance";
import { DataAccessError } from "./data-access";
import { getCurrentMember } from "./current-member";
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

export type GuestGroup = Group & {
  expenses: Expense[];
  settlements: Settlement[];
};

export type GuestData = {
  groups: Record<string, GuestGroup>;
};

export const emptyGuestData: GuestData = { groups: {} };

function generateId(): string {
  return crypto.randomUUID();
}

export function requireGroup(data: GuestData, groupId: string): GuestGroup {
  const group = data.groups[groupId];
  if (!group) {
    throw new DataAccessError(
      `Group "${groupId}" not found`,
      "GROUP_NOT_FOUND",
    );
  }
  return group;
}

function requireMember(group: GuestGroup, memberId: string): Member {
  const member = group.members.find((m) => m.id === memberId);
  if (!member) {
    throw new DataAccessError(
      `Member "${memberId}" not found in group "${group.id}"`,
      "MEMBER_NOT_FOUND",
    );
  }
  return member;
}

export function computeBalances(group: GuestGroup) {
  return calculateBalances({
    memberIds: group.members.map((m) => m.id),
    expenses: group.expenses,
    settlements: group.settlements,
    groupCurrency: group.currency,
  });
}

export function toGroupSummary(group: GuestGroup): GroupSummary {
  const { memberBalances } = computeBalances(group);
  const you = getCurrentMember(group.members);
  const yourBalance =
    memberBalances.find((balance) => balance.memberId === you?.id) ?? null;
  return {
    id: group.id,
    name: group.name,
    currency: group.currency,
    memberCount: group.members.filter((m) => !m.deletedAt).length,
    expenseCount: group.expenses.length,
    memberBalances,
    yourBalance,
  };
}

export function toGroupDetail(group: GuestGroup): GroupDetail {
  const { memberBalances, settlementSuggestions } = computeBalances(group);
  return { ...group, memberBalances, settlementSuggestions };
}

function withGroup(data: GuestData, group: GuestGroup): GuestData {
  return { groups: { ...data.groups, [group.id]: group } };
}

export function createGroup(data: GuestData, input: CreateGroupInput) {
  const group: GuestGroup = {
    id: generateId(),
    name: input.name,
    description: input.description ?? null,
    currency: input.currency,
    createdAt: new Date().toISOString(),
    members: [],
    expenses: [],
    settlements: [],
  };
  return { data: withGroup(data, group), group };
}

export function updateGroup(
  data: GuestData,
  groupId: string,
  input: UpdateGroupInput,
) {
  const existing = requireGroup(data, groupId);
  const group: GuestGroup = {
    ...existing,
    name: input.name,
    description: input.description ?? null,
    currency: input.currency,
  };
  return { data: withGroup(data, group), group };
}

export function deleteGroup(data: GuestData, groupId: string): GuestData {
  const group = requireGroup(data, groupId);
  const { memberBalances } = computeBalances(group);
  if (!memberBalances.every((balance) => balance.isSettled)) {
    throw new DataAccessError(
      `Group "${groupId}" has unsettled balances`,
      "GROUP_NOT_SETTLED",
    );
  }
  const groups = { ...data.groups };
  delete groups[groupId];
  return { groups };
}

export function addMember(
  data: GuestData,
  groupId: string,
  input: AddMemberInput,
) {
  const group = requireGroup(data, groupId);
  const member: Member = {
    id: generateId(),
    groupId,
    userId: null,
    name: input.name,
    email: input.email ?? null,
    avatarColor: input.avatarColor,
    deletedAt: null,
  };
  const updated: GuestGroup = {
    ...group,
    members: [...group.members, member],
  };
  return { data: withGroup(data, updated), member };
}

export function removeMember(
  data: GuestData,
  groupId: string,
  memberId: string,
): GuestData {
  const group = requireGroup(data, groupId);
  const member = requireMember(group, memberId);
  if (member.deletedAt) return data;

  const { memberBalances } = computeBalances(group);
  const balance = memberBalances.find((b) => b.memberId === memberId);
  if (!balance?.isSettled) {
    throw new DataAccessError(
      `Member "${memberId}" has a non-zero balance`,
      "MEMBER_HAS_BALANCE",
    );
  }
  const updated: GuestGroup = {
    ...group,
    members: group.members.map((m) =>
      m.id === memberId ? { ...m, deletedAt: new Date().toISOString() } : m,
    ),
  };
  return withGroup(data, updated);
}

export function createExpense(
  data: GuestData,
  groupId: string,
  input: CreateExpenseInput,
) {
  const group = requireGroup(data, groupId);
  const expense: Expense = { ...input, id: generateId() };
  const updated: GuestGroup = {
    ...group,
    expenses: [...group.expenses, expense],
  };
  return { data: withGroup(data, updated), expense };
}

export function updateExpense(
  data: GuestData,
  groupId: string,
  expenseId: string,
  input: UpdateExpenseInput,
) {
  const group = requireGroup(data, groupId);
  if (!group.expenses.some((e) => e.id === expenseId)) {
    throw new DataAccessError(
      `Expense "${expenseId}" not found in group "${groupId}"`,
      "EXPENSE_NOT_FOUND",
    );
  }
  const expense: Expense = { ...input, id: expenseId };
  const updated: GuestGroup = {
    ...group,
    expenses: group.expenses.map((e) => (e.id === expenseId ? expense : e)),
  };
  return { data: withGroup(data, updated), expense };
}

export function deleteExpense(
  data: GuestData,
  groupId: string,
  expenseId: string,
): GuestData {
  const group = requireGroup(data, groupId);
  if (!group.expenses.some((e) => e.id === expenseId)) {
    throw new DataAccessError(
      `Expense "${expenseId}" not found in group "${groupId}"`,
      "EXPENSE_NOT_FOUND",
    );
  }
  const updated: GuestGroup = {
    ...group,
    expenses: group.expenses.filter((e) => e.id !== expenseId),
  };
  return withGroup(data, updated);
}

export function createSettlement(
  data: GuestData,
  groupId: string,
  input: CreateSettlementInput,
) {
  const group = requireGroup(data, groupId);
  requireMember(group, input.from);
  requireMember(group, input.to);

  const { settlementSuggestions } = computeBalances(group);
  const debtExists = settlementSuggestions.some(
    (s) => s.from === input.from && s.to === input.to,
  );
  if (!debtExists) {
    throw new DataAccessError(
      `"${input.from}" doesn't owe "${input.to}" anything`,
      "NO_DEBT_EXISTS",
    );
  }

  const settlement: Settlement = { ...input, id: generateId() };
  const updated: GuestGroup = {
    ...group,
    settlements: [...group.settlements, settlement],
  };
  return { data: withGroup(data, updated), settlement };
}
