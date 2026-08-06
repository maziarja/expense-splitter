import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { CurrencyCode } from "./constants";
import {
  fromMinorUnits,
  roundToCurrencyPrecision,
  toMinorUnits,
} from "./currency";

export type ExpenseForBalance = {
  paidBy: string;
  currency: CurrencyCode;
  exchangeRate: number;
  splits: { memberId: string; amount: number }[];
};

export type SettlementForBalance = {
  from: string;
  to: string;
  currency: CurrencyCode;
  exchangeRate: number;
  amount: number;
};

export type MemberBalance = {
  memberId: string;
  // In the group's default currency. Positive: owed money. Negative: owes
  // money. Matches spec wording exactly: "total they paid - total they owe."
  netBalance: number;
  // True if netBalance is within one minor unit of zero — a rounding
  // residual from currency conversion, not a real debt. netBalance itself
  // is left as the raw computed value rather than zeroed out, so exact
  // figures stay inspectable; callers use isSettled to decide what to show.
  isSettled: boolean;
};

// A balance within one minor unit of zero (1 cent for most currencies, 1
// yen for JPY) is a rounding residual, not real money owed — the spec
// calls this out explicitly ("rounding errors can leave residual balances
// of $0.01 or less... a threshold below which a balance is treated as
// zero"). Operates on integer minor units, not the converted decimal, to
// avoid float-comparison issues entirely rather than needing a tolerance.
const NEGLIGIBLE_BALANCE_MINOR_UNITS = 1;
function isNegligibleMinorUnits(minorUnits: number): boolean {
  return Math.abs(minorUnits) <= NEGLIGIBLE_BALANCE_MINOR_UNITS;
}

export type SettlementSuggestion = {
  from: string; // owes
  to: string; // is owed
  amount: number; // in the group's default currency, always positive
};

export type BalanceCalculationInput = {
  memberIds: string[];
  expenses: ExpenseForBalance[];
  settlements: SettlementForBalance[];
  groupCurrency: CurrencyCode;
};

export type BalanceCalculationResult = {
  memberBalances: MemberBalance[];
  settlementSuggestions: SettlementSuggestion[];
};

// Converts an amount from its own currency to the group's default currency
// using the rate stored at the time it was recorded, in integer minor units
// of the group currency.
function convertedMinorUnits(
  amount: number,
  exchangeRate: number,
  groupCurrency: CurrencyCode,
): number {
  const converted = roundToCurrencyPrecision(
    amount * exchangeRate,
    groupCurrency,
  );
  return toMinorUnits(converted, groupCurrency);
}

// Sums each expense's *converted, per-split* amounts rather than converting
// expense.amount as a whole — matches how calculateBalances credits the
// payer, so this never drifts from the balance engine's own rounding (summing
// per-split can differ from rounding the whole amount by a cent).
export function calculateTotalSpent(
  expenses: ExpenseForBalance[],
  groupCurrency: CurrencyCode,
): number {
  const totalMinorUnits = expenses.reduce((sum, expense) => {
    const expenseMinorUnits = expense.splits.reduce(
      (splitSum, split) =>
        splitSum +
        convertedMinorUnits(split.amount, expense.exchangeRate, groupCurrency),
      0,
    );
    return sum + expenseMinorUnits;
  }, 0);
  return fromMinorUnits(totalMinorUnits, groupCurrency);
}

export type CategoryBreakdownEntry = {
  category: string;
  total: number;
  percentage: number;
};

export function calculateCategoryBreakdown(
  expenses: (ExpenseForBalance & { category: string })[],
  groupCurrency: CurrencyCode,
): CategoryBreakdownEntry[] {
  const minorUnitsByCategory = new Map<string, number>();
  let totalMinorUnits = 0;
  for (const expense of expenses) {
    const expenseMinorUnits = expense.splits.reduce(
      (splitSum, split) =>
        splitSum +
        convertedMinorUnits(split.amount, expense.exchangeRate, groupCurrency),
      0,
    );
    minorUnitsByCategory.set(
      expense.category,
      (minorUnitsByCategory.get(expense.category) ?? 0) + expenseMinorUnits,
    );
    totalMinorUnits += expenseMinorUnits;
  }
  return Array.from(minorUnitsByCategory.entries())
    .map(([category, minorUnits]) => ({
      category,
      total: fromMinorUnits(minorUnits, groupCurrency),
      percentage:
        totalMinorUnits === 0 ? 0 : (minorUnits / totalMinorUnits) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export type MemberContributionEntry = {
  memberId: string;
  total: number; // in groupCurrency
  byCategory: Record<string, number>; // category -> amount paid; only categories that member actually paid for
};

// "Amount paid" credits the expense's *payer* with the full converted total
// (summed across its own splits, same "sum per-split rather than convert
// the whole amount" reasoning calculateTotalSpent already uses, so this
// never drifts from it) — not each split participant's share. Mirrors
// exactly how calculateBalances credits the payer internally.
//
// Only memberIds get an entry, same roster-driven shape as calculateBalances
// — if a since-removed member historically paid for something, that spend
// isn't attributed to anyone here. Consistent with every other per-member
// view in the app (e.g. GroupSummaryCard's balance list), which likewise
// never resurrects a removed member; it just means this breakdown isn't
// guaranteed to sum to calculateTotalSpent for a group with removed members.
export function calculateMemberContribution(
  memberIds: string[],
  expenses: (ExpenseForBalance & { category: string })[],
  groupCurrency: CurrencyCode,
): MemberContributionEntry[] {
  const minorUnitsByMember = new Map<string, Map<string, number>>(
    memberIds.map((id) => [id, new Map<string, number>()]),
  );

  for (const expense of expenses) {
    const expenseMinorUnits = expense.splits.reduce(
      (splitSum, split) =>
        splitSum +
        convertedMinorUnits(split.amount, expense.exchangeRate, groupCurrency),
      0,
    );
    if (!minorUnitsByMember.has(expense.paidBy)) {
      minorUnitsByMember.set(expense.paidBy, new Map<string, number>());
    }
    const byCategory = minorUnitsByMember.get(expense.paidBy)!;
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + expenseMinorUnits,
    );
  }

  return memberIds.map((memberId) => {
    const byCategoryMinorUnits = minorUnitsByMember.get(memberId) ?? new Map();
    const byCategory: Record<string, number> = {};
    let totalMinorUnits = 0;
    for (const [category, minorUnits] of byCategoryMinorUnits) {
      byCategory[category] = fromMinorUnits(minorUnits, groupCurrency);
      totalMinorUnits += minorUnits;
    }
    return {
      memberId,
      total: fromMinorUnits(totalMinorUnits, groupCurrency),
      byCategory,
    };
  });
}

export type SpendingGranularity = "day" | "week" | "month";

export type SpendingOverTimeEntry = {
  bucketStart: string; // ISO 8601, start of the bucket's day/week/month
  total: number; // in groupCurrency
};

function startOfBucket(date: Date, granularity: SpendingGranularity): Date {
  switch (granularity) {
    case "day":
      return startOfDay(date);
    case "week":
      // weekStartsOn defaults to Sunday (date-fns' own default), matching
      // the rest of this app's lack of a locale/week-start preference
      // anywhere else.
      return startOfWeek(date);
    case "month":
      return startOfMonth(date);
  }
}

function nextBucket(date: Date, granularity: SpendingGranularity): Date {
  switch (granularity) {
    case "day":
      return addDays(date, 1);
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
  }
}

// Buckets each expense's converted, per-split total (same convertedMinorUnits
// path as calculateTotalSpent/calculateCategoryBreakdown, so this never
// drifts from those figures by a cent) into day/week/month buckets. Zero-fills
// every bucket across the continuous range from the earliest to the latest
// expense — not just buckets that happen to contain an expense — so a chart
// built on this shows genuine dips to zero rather than a line connecting
// sparse points across a gap.
export function calculateSpendingOverTime(
  expenses: (ExpenseForBalance & { date: string })[],
  groupCurrency: CurrencyCode,
  granularity: SpendingGranularity,
): SpendingOverTimeEntry[] {
  if (expenses.length === 0) return [];

  const minorUnitsByBucket = new Map<string, number>();
  for (const expense of expenses) {
    const bucketStart = startOfBucket(
      new Date(expense.date),
      granularity,
    ).toISOString();
    const expenseMinorUnits = expense.splits.reduce(
      (splitSum, split) =>
        splitSum +
        convertedMinorUnits(split.amount, expense.exchangeRate, groupCurrency),
      0,
    );
    minorUnitsByBucket.set(
      bucketStart,
      (minorUnitsByBucket.get(bucketStart) ?? 0) + expenseMinorUnits,
    );
  }

  const sortedDates = expenses
    .map((e) => new Date(e.date))
    .sort((a, b) => a.valueOf() - b.valueOf());
  const firstBucket = startOfBucket(sortedDates[0], granularity);
  const lastBucket = startOfBucket(
    sortedDates[sortedDates.length - 1],
    granularity,
  );

  const entries: SpendingOverTimeEntry[] = [];
  for (
    let cursor = firstBucket;
    cursor.valueOf() <= lastBucket.valueOf();
    cursor = nextBucket(cursor, granularity)
  ) {
    const key = cursor.toISOString();
    entries.push({
      bucketStart: key,
      total: fromMinorUnits(minorUnitsByBucket.get(key) ?? 0, groupCurrency),
    });
  }
  return entries;
}

const DAY_GRANULARITY_MAX_SPAN = 14;
const WEEK_GRANULARITY_MAX_SPAN = 70;

// Auto-picks a sensible default granularity from the expense date range: a
// short trip reads best day-by-day, a longer-running group by week or month.
// Still just a default — callers let the user override it.
export function pickSpendingGranularity(
  expenses: { date: string }[],
): SpendingGranularity {
  if (expenses.length < 2) return "day";
  const dates = expenses.map((e) => new Date(e.date).valueOf());
  const spanDays = differenceInCalendarDays(
    new Date(Math.max(...dates)),
    new Date(Math.min(...dates)),
  );
  if (spanDays <= DAY_GRANULARITY_MAX_SPAN) return "day";
  if (spanDays <= WEEK_GRANULARITY_MAX_SPAN) return "week";
  return "month";
}

export function calculateBalances({
  memberIds,
  expenses,
  settlements,
  groupCurrency,
}: BalanceCalculationInput): BalanceCalculationResult {
  const netMinorUnits = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const adjust = (memberId: string, minorUnits: number) =>
    netMinorUnits.set(
      memberId,
      (netMinorUnits.get(memberId) ?? 0) + minorUnits,
    );

  // Pairwise ledger — owedBy[debtor][creditor] = minor units debtor owes
  // creditor — kept separate from netMinorUnits above (rather than derived
  // from it) so the two independently-computed totals can be cross-checked
  // against each other in verification.
  const owedBy = new Map<string, Map<string, number>>();
  const addDebt = (debtor: string, creditor: string, minorUnits: number) => {
    if (debtor === creditor || minorUnits === 0) return;
    if (!owedBy.has(debtor)) owedBy.set(debtor, new Map());
    const row = owedBy.get(debtor)!;
    row.set(creditor, (row.get(creditor) ?? 0) + minorUnits);
  };

  for (const expense of expenses) {
    // Convert each split first, then sum the converted values for the
    // payer's credit — rather than separately converting expense.amount —
    // so the payer's credit exactly equals the sum of participants' debits
    // for this expense, even after currency-conversion rounding.
    const convertedSplits = expense.splits.map((split) => ({
      memberId: split.memberId,
      minorUnits: convertedMinorUnits(
        split.amount,
        expense.exchangeRate,
        groupCurrency,
      ),
    }));
    const totalMinorUnits = convertedSplits.reduce(
      (sum, split) => sum + split.minorUnits,
      0,
    );

    adjust(expense.paidBy, totalMinorUnits);
    for (const split of convertedSplits) {
      adjust(split.memberId, -split.minorUnits);
      addDebt(split.memberId, expense.paidBy, split.minorUnits);
    }
  }

  for (const settlement of settlements) {
    const minorUnits = convertedMinorUnits(
      settlement.amount,
      settlement.exchangeRate,
      groupCurrency,
    );
    // `from` paid `to`, so from's balance rises (debt paid off) and to's
    // falls (they've now been paid what they were owed).
    adjust(settlement.from, minorUnits);
    adjust(settlement.to, -minorUnits);
    addDebt(settlement.from, settlement.to, -minorUnits);
  }

  const memberBalances: MemberBalance[] = memberIds.map((memberId) => {
    const minorUnits = netMinorUnits.get(memberId) ?? 0;
    return {
      memberId,
      netBalance: fromMinorUnits(minorUnits, groupCurrency),
      isSettled: isNegligibleMinorUnits(minorUnits),
    };
  });

  const allLedgerIds = new Set<string>(memberIds);
  for (const [debtor, row] of owedBy) {
    allLedgerIds.add(debtor);
    for (const creditor of row.keys()) allLedgerIds.add(creditor);
  }
  const sortedIds = [...allLedgerIds].sort();

  const settlementSuggestions: SettlementSuggestion[] = [];
  for (let i = 0; i < sortedIds.length; i++) {
    for (let j = i + 1; j < sortedIds.length; j++) {
      const a = sortedIds[i];
      const b = sortedIds[j];
      const aOwesB = owedBy.get(a)?.get(b) ?? 0;
      const bOwesA = owedBy.get(b)?.get(a) ?? 0;
      const net = aOwesB - bOwesA;
      if (isNegligibleMinorUnits(net)) continue;

      if (net > 0) {
        settlementSuggestions.push({
          from: a,
          to: b,
          amount: fromMinorUnits(net, groupCurrency),
        });
      } else if (net < 0) {
        settlementSuggestions.push({
          from: b,
          to: a,
          amount: fromMinorUnits(-net, groupCurrency),
        });
      }
    }
  }

  return { memberBalances, settlementSuggestions };
}
