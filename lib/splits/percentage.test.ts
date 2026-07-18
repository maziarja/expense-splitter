import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import {
  calculatePercentageSplit,
  validatePercentageSplit,
} from "./percentage";
import type { CurrencyCode } from "./constants";

describe("validatePercentageSplit", () => {
  it("accepts percentages that sum to exactly 100", () => {
    expect(validatePercentageSplit([50, 30, 20]).valid).toBe(true);
    expect(validatePercentageSplit([33.33, 33.33, 33.34]).valid).toBe(true);
  });

  it("rejects percentages that don't sum to 100", () => {
    expect(validatePercentageSplit([50, 49]).valid).toBe(false);
    expect(validatePercentageSplit([60, 41]).valid).toBe(false);
  });

  // Regression test: an earlier version compared the raw float sum against
  // 100 with a tolerance, which both mis-flagged this as "close enough"
  // (33.33 x 3 is 0.010000000000005116 away from 100 in IEEE 754, not a
  // clean 0.01) and was semantically wrong anyway — 33.33% x 3 genuinely
  // only sums to 99.99%, a real one-basis-point shortfall.
  it("rejects 33.33 x 3 as a genuine 0.01 shortfall, not float noise", () => {
    const result = validatePercentageSplit([33.33, 33.33, 33.33]);
    expect(result.valid).toBe(false);
    expect(result.sum).toBeCloseTo(99.99, 9);
  });

  it("is not fooled by float-drift-prone sums that are genuinely valid", () => {
    expect(validatePercentageSplit(Array(10).fill(10)).valid).toBe(true);
  });
});

describe("calculatePercentageSplit", () => {
  it("throws when percentages don't sum to 100", () => {
    expect(() =>
      calculatePercentageSplit({
        amount: 10,
        currency: "USD",
        splits: [
          { memberId: "a", percentage: 50 },
          { memberId: "b", percentage: 40 },
        ],
      }),
    ).toThrow();
  });

  it("matches the real percentage-split expense in the seed data exactly", () => {
    const group = sampleData.groups.find(
      (g) => g.name === "Office Lunch Crew",
    )!;
    const expense = group.expenses.find((e) => e.id === "exp_207")!;
    // The JSON import's inferred type doesn't carry the optional
    // percentage/shares fields through .find()/.map() consistently across
    // the whole sample-groups.json file, even though they're present on
    // this specific expense's splits at runtime.
    const splits = expense.splits as {
      memberId: string;
      amount: number;
      percentage: number;
    }[];

    const result = calculatePercentageSplit({
      amount: expense.amount,
      currency: expense.currency as CurrencyCode,
      splits: splits.map((s) => ({
        memberId: s.memberId,
        percentage: s.percentage,
      })),
    });

    expect(result).toEqual(
      splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        percentage: s.percentage,
      })),
    );
  });

  it("gives the rounding remainder to whoever's ideal share is closest to rounding up", () => {
    const result = calculatePercentageSplit({
      amount: 10,
      currency: "USD",
      splits: [
        { memberId: "a", percentage: 33.33 },
        { memberId: "b", percentage: 33.33 },
        { memberId: "c", percentage: 33.34 },
      ],
    });
    expect(result.map((s) => s.amount)).toEqual([3.33, 3.33, 3.34]);
    expect(result.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(10, 9);
  });

  it("resolves tied remainders deterministically via stable sort", () => {
    const result = calculatePercentageSplit({
      amount: 10.01,
      currency: "USD",
      splits: [
        { memberId: "a", percentage: 25 },
        { memberId: "b", percentage: 25 },
        { memberId: "c", percentage: 25 },
        { memberId: "d", percentage: 25 },
      ],
    });
    expect(result.map((s) => s.amount)).toEqual([2.51, 2.5, 2.5, 2.5]);
  });
});
