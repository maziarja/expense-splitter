import { describe, expect, it } from "vitest";
import {
  emptyExpenseFilters,
  filterExpenses,
  filtersFromSearchParams,
  filtersToQueryString,
  hasActiveFilters,
  type ExpenseFilterState,
} from "./expense-filters";
import type { Expense } from "./types";

function makeExpense(overrides?: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    description: "Dinner",
    amount: 40,
    currency: "USD",
    exchangeRate: 1,
    paidBy: "mem_alex",
    splitType: "equal",
    splits: [
      { memberId: "mem_alex", amount: 20 },
      { memberId: "mem_jordan", amount: 20 },
    ],
    date: "2026-01-15T12:00:00.000Z",
    category: "Food & Drink",
    ...overrides,
  };
}

describe("hasActiveFilters", () => {
  it("is false for the empty state", () => {
    expect(hasActiveFilters(emptyExpenseFilters)).toBe(false);
  });

  it("is true when any single field is set", () => {
    expect(
      hasActiveFilters({ ...emptyExpenseFilters, category: "Food & Drink" }),
    ).toBe(true);
  });
});

describe("filterExpenses", () => {
  const dinner = makeExpense({
    id: "dinner",
    category: "Food & Drink",
    paidBy: "mem_alex",
    splits: [
      { memberId: "mem_alex", amount: 20 },
      { memberId: "mem_jordan", amount: 20 },
    ],
    date: "2026-01-15T12:00:00.000Z",
  });
  const taxi = makeExpense({
    id: "taxi",
    category: "Transport",
    paidBy: "mem_jordan",
    splits: [
      { memberId: "mem_jordan", amount: 10 },
      { memberId: "mem_sam", amount: 10 },
    ],
    date: "2026-02-01T09:00:00.000Z",
  });
  const expenses = [dinner, taxi];

  it("returns everything when no filters are active", () => {
    expect(filterExpenses(expenses, emptyExpenseFilters)).toEqual(expenses);
  });

  it("filters by category", () => {
    const result = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      category: "Transport",
    });
    expect(result).toEqual([taxi]);
  });

  it("filters by who paid", () => {
    const result = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      paidBy: "mem_alex",
    });
    expect(result).toEqual([dinner]);
  });

  it("filters by an included participant who isn't the payer", () => {
    const result = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      includesMember: "mem_sam",
    });
    expect(result).toEqual([taxi]);
  });

  it("filters by an inclusive date range", () => {
    const result = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result).toEqual([dinner]);
  });

  it("includes an expense that falls exactly on the from/to boundary day", () => {
    const boundary = makeExpense({
      id: "boundary",
      date: "2026-01-31T23:00:00.000Z",
    });
    const result = filterExpenses([boundary], {
      ...emptyExpenseFilters,
      dateFrom: "2026-01-31",
      dateTo: "2026-01-31",
    });
    expect(result).toEqual([boundary]);
  });

  it("combines category, date range, and paid-by together (AND), matching the spec's own example", () => {
    const janAlexFoodDrink = makeExpense({
      id: "match",
      category: "Food & Drink",
      paidBy: "mem_alex",
      date: "2026-01-10T00:00:00.000Z",
    });
    const wrongCategory = makeExpense({
      id: "wrong-category",
      category: "Transport",
      paidBy: "mem_alex",
      date: "2026-01-10T00:00:00.000Z",
    });
    const wrongPayer = makeExpense({
      id: "wrong-payer",
      category: "Food & Drink",
      paidBy: "mem_jordan",
      date: "2026-01-10T00:00:00.000Z",
    });
    const wrongMonth = makeExpense({
      id: "wrong-month",
      category: "Food & Drink",
      paidBy: "mem_alex",
      date: "2026-02-10T00:00:00.000Z",
    });

    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      category: "Food & Drink",
      paidBy: "mem_alex",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    };
    const result = filterExpenses(
      [janAlexFoodDrink, wrongCategory, wrongPayer, wrongMonth],
      filters,
    );
    expect(result).toEqual([janAlexFoodDrink]);
  });
});

describe("filtersFromSearchParams / filtersToQueryString", () => {
  it("round-trips a full set of filters", () => {
    const filters: ExpenseFilterState = {
      category: "Food & Drink",
      paidBy: "mem_alex",
      includesMember: "mem_jordan",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    };
    const qs = filtersToQueryString(filters);
    const parsed = filtersFromSearchParams(
      Object.fromEntries(new URLSearchParams(qs).entries()),
    );
    expect(parsed).toEqual(filters);
  });

  it("produces an empty query string for the empty state", () => {
    expect(filtersToQueryString(emptyExpenseFilters)).toBe("");
  });

  it("parses missing params as null", () => {
    expect(filtersFromSearchParams({})).toEqual(emptyExpenseFilters);
  });

  it("takes the first value when a param is an array (e.g. from a Server Component's raw searchParams)", () => {
    expect(
      filtersFromSearchParams({ category: ["Food & Drink", "Transport"] }),
    ).toEqual({ ...emptyExpenseFilters, category: "Food & Drink" });
  });
});
