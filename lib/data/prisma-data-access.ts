import { cache } from "react";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getCachedSession } from "../auth";
import { sendAddedToGroupEmail, sendGroupInviteEmail } from "../email";
import { prisma } from "../prisma";
import { calculateBalances } from "../splits/balance";
import {
  normalizeCategoryName,
  PREDEFINED_CATEGORIES,
  type CurrencyCode,
} from "../splits/constants";
import { isNegligibleAmount } from "../splits/currency";
import type { SplitType } from "../splits/schema";
import { pickAvatarColor } from "./avatar-color";
import {
  DataAccessError,
  type DataAccess,
  type DataAccessErrorCode,
} from "./data-access";
import { buildExpenseWhere } from "./expense-where";
import type {
  Category,
  Expense,
  Group,
  Member,
  Settlement,
  Split,
} from "./types";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

async function withNotFound<T>(
  fn: () => Promise<T>,
  code: DataAccessErrorCode,
  message: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new DataAccessError(message, code);
    }
    throw err;
  }
}

// Doesn't reuse requireAuth() from lib/auth.ts: that helper redirects on a
// missing session, a navigation concern that doesn't belong in the data
// layer. Real callers (Server Components/Actions) already call requireAuth()
// at the page/action boundary before reaching here, so this is a defensive
// fallback, not the primary auth check.
async function getSessionUser() {
  const session = await getCachedSession();
  if (!session) {
    throw new DataAccessError("Not authenticated", "UNAUTHENTICATED");
  }
  return session.user;
}

// Reuses GROUP_NOT_FOUND (same message text a genuinely nonexistent group
// gets) rather than a distinct "forbidden" code, so a non-member can't
// distinguish "doesn't exist" from "not yours" via the error.
async function requireGroupMembership(
  client: PrismaLike,
  groupId: string,
  userId: string,
): Promise<void> {
  const membership = await client.member.findFirst({
    where: { groupId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!membership) {
    throw new DataAccessError(
      `Group "${groupId}" not found`,
      "GROUP_NOT_FOUND",
    );
  }
}

// A null ownerId (legacy groups from before this field existed, or a group
// whose owner's account was later deleted) falls back to permissive rather
// than locking everyone out, since there's no way to recover who should own
// it and no transfer-ownership flow to fix it through.
async function requireGroupOwnership(
  client: PrismaLike,
  groupId: string,
  userId: string,
): Promise<{ ownerId: string | null }> {
  const group = await client.group.findFirst({
    where: { id: groupId, members: { some: { userId, deletedAt: null } } },
    select: { ownerId: true },
  });
  if (!group) {
    throw new DataAccessError(
      `Group "${groupId}" not found`,
      "GROUP_NOT_FOUND",
    );
  }
  if (group.ownerId !== null && group.ownerId !== userId) {
    throw new DataAccessError(
      "Only the group owner can do this",
      "NOT_GROUP_OWNER",
    );
  }
  return group;
}

function toMember(row: {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  email: string | null;
  avatarColor: string;
  deletedAt: Date | null;
}): Member {
  return {
    id: row.id,
    groupId: row.groupId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    avatarColor: row.avatarColor,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

function toSplit(row: {
  memberId: string;
  amount: Prisma.Decimal;
  shares: number | null;
  percentage: Prisma.Decimal | null;
}): Split {
  return {
    memberId: row.memberId,
    amount: row.amount.toNumber(),
    shares: row.shares ?? undefined,
    percentage: row.percentage ? row.percentage.toNumber() : undefined,
  };
}

function toExpense(row: {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  currency: string;
  exchangeRate: Prisma.Decimal;
  rateIsUserSet: boolean;
  paidById: string;
  splitType: string;
  date: Date;
  category: string;
  notes: string | null;
  recurring: string | null;
  splits: {
    memberId: string;
    amount: Prisma.Decimal;
    shares: number | null;
    percentage: Prisma.Decimal | null;
  }[];
}): Expense {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount.toNumber(),
    currency: row.currency as CurrencyCode,
    exchangeRate: row.exchangeRate.toNumber(),
    rateIsUserSet: row.rateIsUserSet,
    paidBy: row.paidById,
    splitType: row.splitType as SplitType,
    splits: row.splits.map(toSplit),
    date: row.date.toISOString(),
    category: row.category,
    notes: row.notes ?? undefined,
    recurring: row.recurring as Expense["recurring"],
  };
}

function toSettlement(row: {
  id: string;
  fromId: string;
  toId: string;
  amount: Prisma.Decimal;
  currency: string;
  exchangeRate: Prisma.Decimal;
  date: Date;
}): Settlement {
  return {
    id: row.id,
    from: row.fromId,
    to: row.toId,
    amount: row.amount.toNumber(),
    currency: row.currency as CurrencyCode,
    exchangeRate: row.exchangeRate.toNumber(),
    date: row.date.toISOString(),
  };
}

function toCategory(row: {
  id: string;
  groupId: string;
  name: string;
  color: string;
}): Category {
  return { id: row.id, groupId: row.groupId, name: row.name, color: row.color };
}

function toGroup(row: {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  ownerId: string | null;
  createdAt: Date;
}): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency as CurrencyCode,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    members: [],
  };
}

async function computeGroupBalances(client: PrismaLike, groupId: string) {
  const group = await client.group.findUniqueOrThrow({
    where: { id: groupId },
    select: {
      currency: true,
      members: { select: { id: true } },
      expenses: {
        select: {
          paidById: true,
          currency: true,
          exchangeRate: true,
          splits: { select: { memberId: true, amount: true } },
        },
      },
      settlements: {
        select: {
          fromId: true,
          toId: true,
          currency: true,
          exchangeRate: true,
          amount: true,
        },
      },
    },
  });

  return calculateBalances({
    memberIds: group.members.map((m) => m.id),
    expenses: group.expenses.map((e) => ({
      paidBy: e.paidById,
      currency: e.currency as CurrencyCode,
      exchangeRate: e.exchangeRate.toNumber(),
      splits: e.splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount.toNumber(),
      })),
    })),
    settlements: group.settlements.map((s) => ({
      from: s.fromId,
      to: s.toId,
      currency: s.currency as CurrencyCode,
      exchangeRate: s.exchangeRate.toNumber(),
      amount: s.amount.toNumber(),
    })),
    groupCurrency: group.currency as CurrencyCode,
  });
}

async function recalculateAndPersistBalances(
  client: PrismaLike,
  groupId: string,
) {
  const result = await computeGroupBalances(client, groupId);
  await Promise.all(
    result.memberBalances.map((balance) =>
      client.balance.upsert({
        where: { groupId_memberId: { groupId, memberId: balance.memberId } },
        update: { netAmount: balance.netBalance },
        create: {
          groupId,
          memberId: balance.memberId,
          netAmount: balance.netBalance,
        },
      }),
    ),
  );
  return result;
}

function splitsCreateInput(splits: Split[]) {
  return splits.map((split) => ({
    memberId: split.memberId,
    amount: split.amount,
    shares: split.shares ?? null,
    percentage: split.percentage ?? null,
  }));
}

export const prismaDataAccess: DataAccess = {
  listGroups: cache(async () => {
    const { id: userId } = await getSessionUser();
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId, deletedAt: null } } },
      include: {
        members: true,
        balances: true,
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return groups.map((group) => {
      const currency = group.currency as CurrencyCode;
      const memberBalances = group.members.map((member) => {
        const balanceRow = group.balances.find((b) => b.memberId === member.id);
        const netBalance = balanceRow ? balanceRow.netAmount.toNumber() : 0;
        return {
          memberId: member.id,
          netBalance,
          isSettled: isNegligibleAmount(netBalance, currency),
        };
      });

      const you = group.members.find((m) => m.userId === userId);
      const yourBalance =
        memberBalances.find((balance) => balance.memberId === you?.id) ?? null;

      return {
        id: group.id,
        name: group.name,
        currency,
        memberCount: group.members.filter((m) => !m.deletedAt).length,
        expenseCount: group._count.expenses,
        memberBalances,
        yourBalance,
      };
    });
  }),

  getGroup: cache(async (groupId: string) => {
    const { id: userId } = await getSessionUser();
    const group = await prisma.group.findFirst({
      where: { id: groupId, members: { some: { userId, deletedAt: null } } },
      include: {
        members: true,
        expenses: { include: { splits: true }, orderBy: { date: "desc" } },
        settlements: { orderBy: { date: "desc" } },
        categories: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!group) return null;

    const currency = group.currency as CurrencyCode;
    const { memberBalances, settlementSuggestions } = calculateBalances({
      memberIds: group.members.map((m) => m.id),
      expenses: group.expenses.map((e) => ({
        paidBy: e.paidById,
        currency: e.currency as CurrencyCode,
        exchangeRate: e.exchangeRate.toNumber(),
        splits: e.splits.map((s) => ({
          memberId: s.memberId,
          amount: s.amount.toNumber(),
        })),
      })),
      settlements: group.settlements.map((s) => ({
        from: s.fromId,
        to: s.toId,
        currency: s.currency as CurrencyCode,
        exchangeRate: s.exchangeRate.toNumber(),
        amount: s.amount.toNumber(),
      })),
      groupCurrency: currency,
    });

    return {
      ...toGroup(group),
      members: group.members.map(toMember),
      expenses: group.expenses.map(toExpense),
      settlements: group.settlements.map(toSettlement),
      categories: group.categories.map(toCategory),
      memberBalances,
      settlementSuggestions,
    };
  }),

  async createGroup(input) {
    const user = await getSessionUser();
    const group = await prisma.group.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        currency: input.currency,
        owner: { connect: { id: user.id } },
        members: {
          create: {
            user: { connect: { id: user.id } },
            name: user.name,
            email: user.email,
            avatarColor: pickAvatarColor([]),
          },
        },
      },
    });
    return toGroup(group);
  },

  async updateGroup(groupId, input) {
    const { id: userId } = await getSessionUser();
    await requireGroupOwnership(prisma, groupId, userId);
    const group = await withNotFound(
      () =>
        prisma.group.update({
          where: { id: groupId },
          data: {
            name: input.name,
            description: input.description ?? null,
            currency: input.currency,
          },
        }),
      "GROUP_NOT_FOUND",
      `Group "${groupId}" not found`,
    );
    return toGroup(group);
  },

  async deleteGroup(groupId) {
    const { id: userId } = await getSessionUser();
    await requireGroupOwnership(prisma, groupId, userId);
    const { memberBalances } = await withNotFound(
      () => computeGroupBalances(prisma, groupId),
      "GROUP_NOT_FOUND",
      `Group "${groupId}" not found`,
    );
    if (!memberBalances.every((balance) => balance.isSettled)) {
      throw new DataAccessError(
        `Group "${groupId}" has unsettled balances`,
        "GROUP_NOT_SETTLED",
      );
    }
    await prisma.group.delete({ where: { id: groupId } });
  },

  async addMember(groupId, input) {
    const sessionUser = await getSessionUser();
    await requireGroupMembership(prisma, groupId, sessionUser.id);

    if (input.email) {
      const existingMember = await prisma.member.findFirst({
        where: {
          groupId,
          deletedAt: null,
          email: { equals: input.email, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (existingMember) {
        throw new DataAccessError(
          "This email is already used by another member in this group",
          "MEMBER_EMAIL_TAKEN",
        );
      }
    }

    const matchedUser = input.email
      ? await prisma.user.findFirst({
          where: { email: { equals: input.email, mode: "insensitive" } },
          select: { id: true, email: true },
        })
      : null;

    let member;
    try {
      member = await withNotFound(
        () =>
          prisma.member.create({
            data: {
              group: { connect: { id: groupId } },
              ...(matchedUser
                ? { user: { connect: { id: matchedUser.id } } }
                : {}),
              name: input.name,
              email: input.email ?? null,
              avatarColor: input.avatarColor,
            },
          }),
        "GROUP_NOT_FOUND",
        `Group "${groupId}" not found`,
      );
    } catch (err) {
      if (
        matchedUser &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new DataAccessError(
          "This person is already in the group",
          "MEMBER_ALREADY_LINKED",
        );
      }
      throw err;
    }

    if (input.email) {
      const group = await prisma.group.findUniqueOrThrow({
        where: { id: groupId },
        select: { name: true },
      });
      const emailArgs = { groupName: group.name, inviterName: sessionUser.name };
      const sendEmail = matchedUser
        ? sendAddedToGroupEmail(matchedUser.email, { ...emailArgs, groupId })
        : sendGroupInviteEmail(input.email, emailArgs);
      await sendEmail.catch((err) =>
        console.error("Failed to send member notification email", err),
      );
    }

    return toMember(member);
  },

  async removeMember(groupId, memberId) {
    const { id: userId } = await getSessionUser();
    await prisma.$transaction(async (tx) => {
      const { ownerId } = await requireGroupOwnership(tx, groupId, userId);
      const member = await tx.member.findFirst({
        where: { id: memberId, groupId },
      });
      if (!member) {
        throw new DataAccessError(
          `Member "${memberId}" not found in group "${groupId}"`,
          "MEMBER_NOT_FOUND",
        );
      }
      if (member.deletedAt) return;

      if (ownerId !== null && member.userId === ownerId) {
        throw new DataAccessError(
          "The group owner can't remove themselves",
          "OWNER_CANNOT_REMOVE_SELF",
        );
      }

      const { memberBalances } = await computeGroupBalances(tx, groupId);
      const balance = memberBalances.find((b) => b.memberId === memberId);
      if (!balance?.isSettled) {
        throw new DataAccessError(
          `Member "${memberId}" has a non-zero balance`,
          "MEMBER_HAS_BALANCE",
        );
      }

      await tx.member.update({
        where: { id: memberId },
        data: { deletedAt: new Date() },
      });
    });
  },

  async listExpenses(groupId, options) {
    const { id: userId } = await getSessionUser();
    await requireGroupMembership(prisma, groupId, userId);
    const expenses = await prisma.expense.findMany({
      where: buildExpenseWhere(groupId, options?.filters),
      include: { splits: true },
      orderBy: { date: "desc" },
      ...(options?.limit ? { take: options.limit } : {}),
    });
    return expenses.map(toExpense);
  },

  async getExpense(groupId, expenseId) {
    const { id: userId } = await getSessionUser();
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        groupId,
        group: { members: { some: { userId, deletedAt: null } } },
      },
      include: { splits: true },
    });
    return expense ? toExpense(expense) : null;
  },

  async createExpense(groupId, input) {
    const { id: userId } = await getSessionUser();
    return prisma.$transaction(async (tx) => {
      await requireGroupMembership(tx, groupId, userId);
      const expense = await withNotFound(
        () =>
          tx.expense.create({
            data: {
              group: { connect: { id: groupId } },
              description: input.description,
              amount: input.amount,
              currency: input.currency,
              exchangeRate: input.exchangeRate,
              rateIsUserSet: input.rateIsUserSet ?? false,
              paidBy: { connect: { id: input.paidBy } },
              splitType: input.splitType,
              date: new Date(input.date),
              category: input.category,
              notes: input.notes ?? null,
              recurring: input.recurring ?? null,
              splits: { create: splitsCreateInput(input.splits) },
            },
            include: { splits: true },
          }),
        "GROUP_NOT_FOUND",
        `Group "${groupId}" not found`,
      );
      await recalculateAndPersistBalances(tx, groupId);
      return toExpense(expense);
    });
  },

  async updateExpense(groupId, expenseId, input) {
    const { id: userId } = await getSessionUser();
    return prisma.$transaction(async (tx) => {
      await requireGroupMembership(tx, groupId, userId);
      const existing = await tx.expense.findFirst({
        where: { id: expenseId, groupId },
      });
      if (!existing) {
        throw new DataAccessError(
          `Expense "${expenseId}" not found in group "${groupId}"`,
          "EXPENSE_NOT_FOUND",
        );
      }

      await tx.split.deleteMany({ where: { expenseId } });
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: input.description,
          amount: input.amount,
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          rateIsUserSet: input.rateIsUserSet ?? false,
          paidById: input.paidBy,
          splitType: input.splitType,
          date: new Date(input.date),
          category: input.category,
          notes: input.notes ?? null,
          recurring: input.recurring ?? null,
          splits: { create: splitsCreateInput(input.splits) },
        },
        include: { splits: true },
      });
      await recalculateAndPersistBalances(tx, groupId);
      return toExpense(expense);
    });
  },

  async deleteExpense(groupId, expenseId) {
    const { id: userId } = await getSessionUser();
    await prisma.$transaction(async (tx) => {
      await requireGroupMembership(tx, groupId, userId);
      const existing = await tx.expense.findFirst({
        where: { id: expenseId, groupId },
      });
      if (!existing) {
        throw new DataAccessError(
          `Expense "${expenseId}" not found in group "${groupId}"`,
          "EXPENSE_NOT_FOUND",
        );
      }
      await tx.expense.delete({ where: { id: expenseId } });
      await recalculateAndPersistBalances(tx, groupId);
    });
  },

  async listSettlements(groupId) {
    const { id: userId } = await getSessionUser();
    await requireGroupMembership(prisma, groupId, userId);
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { date: "desc" },
    });
    return settlements.map(toSettlement);
  },

  async createSettlement(groupId, input) {
    const { id: userId } = await getSessionUser();
    return prisma.$transaction(async (tx) => {
      const group = await tx.group.findFirst({
        where: { id: groupId, members: { some: { userId, deletedAt: null } } },
        select: {
          ownerId: true,
          members: {
            where: { userId, deletedAt: null },
            select: { id: true },
          },
        },
      });
      if (!group) {
        throw new DataAccessError(
          `Group "${groupId}" not found`,
          "GROUP_NOT_FOUND",
        );
      }
      const isOwner = group.ownerId === null || group.ownerId === userId;
      const callerMemberId = group.members[0]?.id;
      const isParty =
        callerMemberId === input.from || callerMemberId === input.to;
      if (!isOwner && !isParty) {
        throw new DataAccessError(
          "You can only settle debts you're part of",
          "NOT_SETTLEMENT_PARTY",
        );
      }

      const { settlementSuggestions } = await withNotFound(
        () => computeGroupBalances(tx, groupId),
        "GROUP_NOT_FOUND",
        `Group "${groupId}" not found`,
      );
      const debtExists = settlementSuggestions.some(
        (s) => s.from === input.from && s.to === input.to,
      );
      if (!debtExists) {
        throw new DataAccessError(
          `"${input.from}" doesn't owe "${input.to}" anything`,
          "NO_DEBT_EXISTS",
        );
      }

      const settlement = await tx.settlement.create({
        data: {
          group: { connect: { id: groupId } },
          from: { connect: { id: input.from } },
          to: { connect: { id: input.to } },
          amount: input.amount,
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          date: new Date(input.date),
        },
      });
      await recalculateAndPersistBalances(tx, groupId);
      return toSettlement(settlement);
    });
  },

  async createCategory(groupId, input) {
    const { id: userId } = await getSessionUser();
    await requireGroupMembership(prisma, groupId, userId);
    const name = normalizeCategoryName(input.name);
    const existing = await prisma.category.findMany({
      where: { groupId },
      select: { name: true },
    });
    const taken = [
      ...PREDEFINED_CATEGORIES,
      ...existing.map((c) => c.name),
    ].some((c) => c.toLowerCase() === name.toLowerCase());
    if (taken) {
      throw new DataAccessError(
        `Category "${name}" already exists`,
        "CATEGORY_NAME_TAKEN",
      );
    }
    const category = await prisma.category.create({
      data: { group: { connect: { id: groupId } }, name, color: input.color },
    });
    return toCategory(category);
  },

  async deleteCategory(groupId, categoryId) {
    const { id: userId } = await getSessionUser();
    await prisma.$transaction(async (tx) => {
      await requireGroupMembership(tx, groupId, userId);
      const existing = await tx.category.findFirst({
        where: { id: categoryId, groupId },
      });
      if (!existing) {
        throw new DataAccessError(
          `Category "${categoryId}" not found in group "${groupId}"`,
          "CATEGORY_NOT_FOUND",
        );
      }
      await tx.category.delete({ where: { id: categoryId } });
    });
  },
};
