import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { calculateEqualSplit } from "./equal";
import type { CurrencyCode } from "./constants";

describe("calculateEqualSplit", () => {
  it("throws when there are no participants", () => {
    expect(() =>
      calculateEqualSplit({
        amount: 10,
        currency: "USD",
        participantIds: [],
      }),
    ).toThrow();
  });

  // Documented rounding edge cases from data/README.md's "Rounding &
  // precision" table.
  it.each([
    ["$24.50 / 4", 24.5, "USD", 4, [6.13, 6.13, 6.12, 6.12]],
    ["$142.37 / 3", 142.37, "USD", 3, [47.46, 47.46, 47.45]],
    ["$34.99 / 5", 34.99, "USD", 5, [7, 7, 7, 7, 6.99]],
    ["¥4,850 / 4", 4850, "JPY", 4, [1213, 1213, 1212, 1212]],
  ] as const)(
    "%s matches the documented split exactly",
    (_label, amount, currency, participantCount, expected) => {
      const participantIds = Array.from(
        { length: participantCount },
        (_, i) => `m${i}`,
      );
      const result = calculateEqualSplit({
        amount,
        currency: currency as CurrencyCode,
        participantIds,
      });
      expect(result.map((s) => s.amount)).toEqual(expected);
      expect(result.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(
        amount,
        9,
      );
    },
  );

  it("distributes the remainder to the first N participants in list order, not the payer", () => {
    // exp_006 (Trip to Japan): paidBy is mem_jordan, but the extra yen went
    // to mem_alex (first in the splits list) and mem_jordan (second) — not
    // special-cased to the payer.
    const result = calculateEqualSplit({
      amount: 4850,
      currency: "JPY",
      participantIds: ["mem_alex", "mem_jordan", "mem_sam", "mem_taylor"],
    });
    expect(result).toEqual([
      { memberId: "mem_alex", amount: 1213 },
      { memberId: "mem_jordan", amount: 1213 },
      { memberId: "mem_sam", amount: 1212 },
      { memberId: "mem_taylor", amount: 1212 },
    ]);
  });

  it("matches every real equal-split expense in the seed data exactly", () => {
    for (const group of sampleData.groups) {
      for (const expense of group.expenses) {
        if (expense.splitType !== "equal") continue;

        const participantIds = expense.splits.map((s) => s.memberId);
        const result = calculateEqualSplit({
          amount: expense.amount,
          currency: expense.currency as CurrencyCode,
          participantIds,
        });

        expect(result, `${group.name} / ${expense.id}`).toEqual(
          expense.splits.map((s) => ({
            memberId: s.memberId,
            amount: s.amount,
          })),
        );
      }
    }
  });

  it("recalculates correctly when a member is excluded and re-included", () => {
    // Trip to Japan / Osaka Castle entry: Taylor excluded from a 4-person group.
    const allMembers = ["mem_alex", "mem_jordan", "mem_sam", "mem_taylor"];
    const excluded = allMembers.filter((id) => id !== "mem_taylor");

    const withExclusion = calculateEqualSplit({
      amount: 2400,
      currency: "JPY",
      participantIds: excluded,
    });
    expect(withExclusion).toEqual([
      { memberId: "mem_alex", amount: 800 },
      { memberId: "mem_jordan", amount: 800 },
      { memberId: "mem_sam", amount: 800 },
    ]);

    const reincluded = calculateEqualSplit({
      amount: 2400,
      currency: "JPY",
      participantIds: allMembers,
    });
    expect(reincluded.every((s) => s.amount === 600)).toBe(true);
  });
});
