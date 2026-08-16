import { endOfDay, parseISO, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  emptyExpenseFilters,
  filterExpenses,
  filtersFromSearchParams,
  filtersToQueryString,
  hasActiveFilters,
  INITIAL_VISIBLE_EXPENSES,
  MAX_VISIBLE_EXPENSES,
  parseShowParam,
  sortByDateDesc,
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

  it("excludes an expense that falls just outside the range boundary", () => {
    const rangeStart = startOfDay(parseISO("2026-01-31"));
    const rangeEnd = endOfDay(parseISO("2026-01-31"));
    const justBefore = makeExpense({
      id: "just-before",
      date: new Date(rangeStart.getTime() - 1).toISOString(),
    });
    const justAfter = makeExpense({
      id: "just-after",
      date: new Date(rangeEnd.getTime() + 1).toISOString(),
    });
    const result = filterExpenses([justBefore, justAfter], {
      ...emptyExpenseFilters,
      dateFrom: "2026-01-31",
      dateTo: "2026-01-31",
    });
    expect(result).toEqual([]);
  });

  it("matches nothing for an inverted range (dateFrom after dateTo)", () => {
    const result = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      dateFrom: "2026-02-01",
      dateTo: "2026-01-01",
    });
    expect(result).toEqual([]);
  });

  it("combines includesMember with paidBy, category, and a date range individually", () => {
    expect(
      filterExpenses(expenses, {
        ...emptyExpenseFilters,
        includesMember: "mem_jordan",
        paidBy: "mem_jordan",
      }),
    ).toEqual([taxi]);

    expect(
      filterExpenses(expenses, {
        ...emptyExpenseFilters,
        includesMember: "mem_alex",
        category: "Food & Drink",
      }),
    ).toEqual([dinner]);

    expect(
      filterExpenses(expenses, {
        ...emptyExpenseFilters,
        includesMember: "mem_sam",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
      }),
    ).toEqual([taxi]);
  });

  it("composes includesMember and paidBy independently rather than treating them as the same check", () => {
    // mem_jordan is a split participant on `dinner` without being its payer —
    // includesMember + the real payer (mem_alex) should still match.
    const matchesRealPayer = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      includesMember: "mem_jordan",
      paidBy: "mem_alex",
    });
    expect(matchesRealPayer).toEqual([dinner]);

    // Same includesMember, but a paidBy that no expense actually has —
    // AND semantics mean neither expense should match.
    const noMatch = filterExpenses(expenses, {
      ...emptyExpenseFilters,
      includesMember: "mem_jordan",
      paidBy: "mem_sam",
    });
    expect(noMatch).toEqual([]);
  });

  it("returns nothing when every filter is active but no expense matches all of them", () => {
    const result = filterExpenses(expenses, {
      category: "Food & Drink",
      paidBy: "mem_alex",
      includesMember: "mem_sam",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result).toEqual([]);
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

  it("includes show only when it's above the initial default", () => {
    expect(filtersToQueryString(emptyExpenseFilters, 25)).toBe("show=25");
    expect(
      filtersToQueryString(emptyExpenseFilters, INITIAL_VISIBLE_EXPENSES),
    ).toBe("");
    expect(filtersToQueryString(emptyExpenseFilters, null)).toBe("");
    expect(filtersToQueryString(emptyExpenseFilters)).toBe("");
  });

  it("combines filters and show in one query string", () => {
    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      category: "Transport",
    };
    expect(filtersToQueryString(filters, 45)).toBe(
      "category=Transport&show=45",
    );
  });
});

describe("parseShowParam", () => {
  it("defaults to the initial visible count when absent", () => {
    expect(parseShowParam(undefined)).toBe(INITIAL_VISIBLE_EXPENSES);
  });

  it("parses a valid numeric string", () => {
    expect(parseShowParam("25")).toBe(25);
  });

  it("clamps below the initial default back up to it", () => {
    expect(parseShowParam("1")).toBe(INITIAL_VISIBLE_EXPENSES);
    expect(parseShowParam("-5")).toBe(INITIAL_VISIBLE_EXPENSES);
  });

  it("clamps above the max back down to it", () => {
    expect(parseShowParam("999999")).toBe(MAX_VISIBLE_EXPENSES);
  });

  it("falls back to the default for non-numeric input", () => {
    expect(parseShowParam("not-a-number")).toBe(INITIAL_VISIBLE_EXPENSES);
  });

  it("takes the first value when given an array", () => {
    expect(parseShowParam(["45", "5"])).toBe(45);
  });
});

describe("sortByDateDesc", () => {
  it("sorts most-recent-first without mutating the input", () => {
    const older = makeExpense({
      id: "older",
      date: "2026-01-01T00:00:00.000Z",
    });
    const newer = makeExpense({
      id: "newer",
      date: "2026-02-01T00:00:00.000Z",
    });
    const input = [older, newer];

    const sorted = sortByDateDesc(input);

    expect(sorted).toEqual([newer, older]);
    expect(input).toEqual([older, newer]);
  });
});
