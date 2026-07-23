import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { calculateBalances } from "../splits/balance";
import type { CurrencyCode } from "../splits/constants";
import { isNegligibleAmount } from "../splits/currency";
import type { SplitType } from "../splits/schema";
import { getCurrentMember } from "./current-member";
import {
  DataAccessError,
  type DataAccess,
  type DataAccessErrorCode,
} from "./data-access";
import type { Expense, Group, Member, Settlement, Split } from "./types";

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

async function requireGroupExists(
  client: PrismaLike,
  groupId: string,
): Promise<void> {
  const exists = await client.group.findUnique({
    where: { id: groupId },
    select: { id: true },
  });
  if (!exists) {
    throw new DataAccessError(
      `Group "${groupId}" not found`,
      "GROUP_NOT_FOUND",
    );
  }
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

function toGroup(row: {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  createdAt: Date;
}): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    currency: row.currency as CurrencyCode,
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
  async listGroups() {
    const groups = await prisma.group.findMany({
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

      // TODO(Phase 6): once auth is wired up, resolve "you" from the
      // session's userId instead of the members[0] placeholder convention.
      const you = getCurrentMember(group.members.map(toMember));
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
  },

  async getGroup(groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        expenses: { include: { splits: true }, orderBy: { date: "desc" } },
        settlements: { orderBy: { date: "desc" } },
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
      memberBalances,
      settlementSuggestions,
    };
  },

  async createGroup(input) {
    const group = await prisma.group.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        currency: input.currency,
      },
    });
    return toGroup(group);
  },

  async updateGroup(groupId, input) {
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
    const member = await withNotFound(
      () =>
        prisma.member.create({
          data: {
            group: { connect: { id: groupId } },
            name: input.name,
            email: input.email ?? null,
            avatarColor: input.avatarColor,
          },
        }),
      "GROUP_NOT_FOUND",
      `Group "${groupId}" not found`,
    );
    return toMember(member);
  },

  async removeMember(groupId, memberId) {
    await prisma.$transaction(async (tx) => {
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

  async listExpenses(groupId) {
    await requireGroupExists(prisma, groupId);
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
      orderBy: { date: "desc" },
    });
    return expenses.map(toExpense);
  },

  async getExpense(groupId, expenseId) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
      include: { splits: true },
    });
    return expense ? toExpense(expense) : null;
  },

  async createExpense(groupId, input) {
    return prisma.$transaction(async (tx) => {
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
    return prisma.$transaction(async (tx) => {
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
    await prisma.$transaction(async (tx) => {
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
    await requireGroupExists(prisma, groupId);
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { date: "desc" },
    });
    return settlements.map(toSettlement);
  },

  async createSettlement(groupId, input) {
    return prisma.$transaction(async (tx) => {
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
};
