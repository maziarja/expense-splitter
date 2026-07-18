import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { validateExactSplit } from "./exact";
import type { CurrencyCode } from "./constants";

describe("validateExactSplit", () => {
  it("accepts splits that sum exactly to the total", () => {
    expect(validateExactSplit(100, "USD", [50, 50])).toEqual({
      valid: true,
      differenceMinorUnits: 0,
    });
  });

  it("rejects splits short by one cent", () => {
    expect(validateExactSplit(100, "USD", [50, 49.99])).toEqual({
      valid: false,
      differenceMinorUnits: -1,
    });
  });

  it("rejects splits over by one cent", () => {
    expect(validateExactSplit(100, "USD", [50.01, 50])).toEqual({
      valid: false,
      differenceMinorUnits: 1,
    });
  });

  it("validates every real exact-split expense in the seed data", () => {
    for (const group of sampleData.groups) {
      for (const expense of group.expenses) {
        if (expense.splitType !== "exact") continue;

        const { valid } = validateExactSplit(
          expense.amount,
          expense.currency as CurrencyCode,
          expense.splits.map((s) => s.amount),
        );
        expect(valid, `${group.name} / ${expense.id}`).toBe(true);
      }
    }
  });
});
