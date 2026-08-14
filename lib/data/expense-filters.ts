import { endOfDay, parseISO, startOfDay } from "date-fns";
import type { Expense } from "./types";

export type ExpenseFilterState = {
  category: string | null;
  paidBy: string | null;
  includesMember: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export const emptyExpenseFilters: ExpenseFilterState = {
  category: null,
  paidBy: null,
  includesMember: null,
  dateFrom: null,
  dateTo: null,
};

export const INITIAL_VISIBLE_EXPENSES = 5;
export const LOAD_MORE_INCREMENT = 20;
export const MAX_VISIBLE_EXPENSES = 500; // clamp against a hand-edited ?show= URL

export function parseShowParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? Number.parseInt(raw, 10) : INITIAL_VISIBLE_EXPENSES;
  if (!Number.isFinite(n) || n < INITIAL_VISIBLE_EXPENSES) {
    return INITIAL_VISIBLE_EXPENSES;
  }
  return Math.min(n, MAX_VISIBLE_EXPENSES);
}

export function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf(),
  );
}

export function hasActiveFilters(filters: ExpenseFilterState): boolean {
  return (
    filters.category !== null ||
    filters.paidBy !== null ||
    filters.includesMember !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseFilterState,
): Expense[] {
  return expenses.filter((expense) => {
    if (filters.category && expense.category !== filters.category) {
      return false;
    }
    if (filters.paidBy && expense.paidBy !== filters.paidBy) {
      return false;
    }
    if (
      filters.includesMember &&
      !expense.splits.some((s) => s.memberId === filters.includesMember)
    ) {
      return false;
    }
    const expenseDate = parseISO(expense.date);
    if (
      filters.dateFrom &&
      expenseDate < startOfDay(parseISO(filters.dateFrom))
    ) {
      return false;
    }
    if (filters.dateTo && expenseDate > endOfDay(parseISO(filters.dateTo))) {
      return false;
    }
    return true;
  });
}

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Plain Record in, not tied to next/navigation — works from a Server
// Component's awaited `searchParams` prop directly, and from a client
// `useSearchParams()` via `Object.fromEntries(sp.entries())`.
export function filtersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): ExpenseFilterState {
  return {
    category: firstValue(params.category),
    paidBy: firstValue(params.paidBy),
    includesMember: firstValue(params.includes),
    dateFrom: firstValue(params.from),
    dateTo: firstValue(params.to),
  };
}

// Builds a query string (via URLSearchParams, a standard Web API — safe in
// both server and client code) from the current filters, dropping null
// values entirely so the URL stays clean when nothing's active. `show` is a
// separate, optional concern (how many expenses are revealed, not what's
// filtered) — omitting it (the default) means callers that only touch
// filters, like expense-filters.tsx's navigate(), naturally reset pagination
// back to the initial page whenever a filter changes.
export function filtersToQueryString(
  filters: ExpenseFilterState,
  show?: number | null,
): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.paidBy) params.set("paidBy", filters.paidBy);
  if (filters.includesMember) params.set("includes", filters.includesMember);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (show && show > INITIAL_VISIBLE_EXPENSES) {
    params.set("show", String(show));
  }
  return params.toString();
}
