import { endOfDay, parseISO, startOfDay } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import type { ExpenseFilterState } from "./expense-filters";

// Mirrors filterExpenses (lib/data/expense-filters.ts) as a Prisma `where`
// clause, for listExpenses' paginated query. Must use the exact same
// startOfDay/endOfDay date-boundary functions filterExpenses does, so the
// paginated list and the in-memory-filtered count/charts can't silently
// disagree at day boundaries. Kept in its own file (rather than inline in
// prisma-data-access.ts) so it stays a pure, side-effect-free unit —
// prisma-data-access.ts transitively imports lib/auth.ts, which constructs
// a Resend client at module load time and throws without an API key, which
// would otherwise make this function untestable in isolation.
export function buildExpenseWhere(
  groupId: string,
  filters?: ExpenseFilterState,
): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { groupId };
  if (!filters) return where;

  if (filters.category) where.category = filters.category;
  if (filters.paidBy) where.paidById = filters.paidBy;
  if (filters.includesMember) {
    where.splits = { some: { memberId: filters.includesMember } };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {
      ...(filters.dateFrom && {
        gte: startOfDay(parseISO(filters.dateFrom)),
      }),
      ...(filters.dateTo && { lte: endOfDay(parseISO(filters.dateTo)) }),
    };
  }
  return where;
}
