import { endOfDay, parseISO, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  emptyExpenseFilters,
  type ExpenseFilterState,
} from "./expense-filters";
import { buildExpenseWhere } from "./expense-where";

describe("buildExpenseWhere", () => {
  it("scopes to the group with no other clauses when filters are omitted", () => {
    expect(buildExpenseWhere("grp_1")).toEqual({ groupId: "grp_1" });
  });

  it("scopes to the group with no other clauses for the empty filter state", () => {
    expect(buildExpenseWhere("grp_1", emptyExpenseFilters)).toEqual({
      groupId: "grp_1",
    });
  });

  it("maps category to an equality clause", () => {
    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      category: "Transport",
    };
    expect(buildExpenseWhere("grp_1", filters)).toEqual({
      groupId: "grp_1",
      category: "Transport",
    });
  });

  it("maps paidBy to a paidById equality clause", () => {
    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      paidBy: "mem_alex",
    };
    expect(buildExpenseWhere("grp_1", filters)).toEqual({
      groupId: "grp_1",
      paidById: "mem_alex",
    });
  });

  it("maps includesMember to a splits.some clause", () => {
    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      includesMember: "mem_sam",
    };
    expect(buildExpenseWhere("grp_1", filters)).toEqual({
      groupId: "grp_1",
      splits: { some: { memberId: "mem_sam" } },
    });
  });

  it("maps a date range to the exact same startOfDay/endOfDay boundaries filterExpenses uses", () => {
    const filters: ExpenseFilterState = {
      ...emptyExpenseFilters,
      dateFrom: "2026-01-31",
      dateTo: "2026-02-01",
    };
    expect(buildExpenseWhere("grp_1", filters)).toEqual({
      groupId: "grp_1",
      date: {
        gte: startOfDay(parseISO("2026-01-31")),
        lte: endOfDay(parseISO("2026-02-01")),
      },
    });
  });

  it("supports an open-ended date range on either side", () => {
    expect(
      buildExpenseWhere("grp_1", {
        ...emptyExpenseFilters,
        dateFrom: "2026-01-31",
      }),
    ).toEqual({
      groupId: "grp_1",
      date: { gte: startOfDay(parseISO("2026-01-31")) },
    });

    expect(
      buildExpenseWhere("grp_1", {
        ...emptyExpenseFilters,
        dateTo: "2026-01-31",
      }),
    ).toEqual({
      groupId: "grp_1",
      date: { lte: endOfDay(parseISO("2026-01-31")) },
    });
  });

  it("combines every filter together", () => {
    const filters: ExpenseFilterState = {
      category: "Food & Drink",
      paidBy: "mem_alex",
      includesMember: "mem_jordan",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    };
    expect(buildExpenseWhere("grp_1", filters)).toEqual({
      groupId: "grp_1",
      category: "Food & Drink",
      paidById: "mem_alex",
      splits: { some: { memberId: "mem_jordan" } },
      date: {
        gte: startOfDay(parseISO("2026-01-01")),
        lte: endOfDay(parseISO("2026-01-31")),
      },
    });
  });
});
