import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { calculateSharesSplit } from "./shares";
import type { CurrencyCode } from "./constants";

describe("calculateSharesSplit", () => {
  it("throws when total shares is zero", () => {
    expect(() =>
      calculateSharesSplit({
        amount: 10,
        currency: "USD",
        splits: [
          { memberId: "a", shares: 0 },
          { memberId: "b", shares: 0 },
        ],
      }),
    ).toThrow();
  });

  it("matches the real shares-split expense in the seed data exactly", () => {
    const group = sampleData.groups.find((g) => g.name === "Trip to Japan")!;
    const expense = group.expenses.find((e) => e.id === "exp_012")!;
    // The JSON import's inferred type doesn't carry the optional
    // percentage/shares fields through .find()/.map() consistently across
    // the whole sample-groups.json file, even though they're present on
    // this specific expense's splits at runtime.
    const splits = expense.splits as {
      memberId: string;
      amount: number;
      shares: number;
    }[];

    const result = calculateSharesSplit({
      amount: expense.amount,
      currency: expense.currency as CurrencyCode,
      splits: splits.map((s) => ({
        memberId: s.memberId,
        shares: s.shares,
      })),
    });

    expect(result).toEqual(
      splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shares: s.shares,
      })),
    );
  });

  it("distributes a remainder that doesn't divide evenly", () => {
    const result = calculateSharesSplit({
      amount: 10,
      currency: "USD",
      splits: [
        { memberId: "a", shares: 1 },
        { memberId: "b", shares: 1 },
        { memberId: "c", shares: 1 },
      ],
    });
    expect(result.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(10, 9);
  });

  it("handles unevenly weighted shares that divide evenly", () => {
    const result = calculateSharesSplit({
      amount: 50,
      currency: "USD",
      splits: [
        { memberId: "a", shares: 3 },
        { memberId: "b", shares: 2 },
      ],
    });
    expect(result.map((s) => s.amount)).toEqual([30, 20]);
  });

  it("works correctly for zero-decimal JPY", () => {
    const result = calculateSharesSplit({
      amount: 1000,
      currency: "JPY",
      splits: [
        { memberId: "a", shares: 1 },
        { memberId: "b", shares: 1 },
        { memberId: "c", shares: 1 },
      ],
    });
    expect(result.every((s) => Number.isInteger(s.amount))).toBe(true);
    expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(1000);
  });
});
