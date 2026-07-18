import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { calculateBalances } from "./balance";
import type { CurrencyCode } from "./constants";

function balancesForGroup(group: (typeof sampleData.groups)[number]) {
  return calculateBalances({
    memberIds: group.members.map((m) => m.id),
    expenses: group.expenses.map((e) => ({
      paidBy: e.paidBy,
      currency: e.currency as CurrencyCode,
      exchangeRate: e.exchangeRate,
      splits: e.splits.map((s) => ({ memberId: s.memberId, amount: s.amount })),
    })),
    settlements: group.settlements.map((s) => ({
      from: s.from,
      to: s.to,
      currency: s.currency as CurrencyCode,
      exchangeRate: s.exchangeRate,
      amount: s.amount,
    })),
    groupCurrency: group.currency as CurrencyCode,
  });
}

describe("calculateBalances", () => {
  it.each(sampleData.groups.map((g) => [g.name, g] as const))(
    "%s: balances sum to exactly zero",
    (_name, group) => {
      const { memberBalances } = balancesForGroup(group);
      const sum = memberBalances.reduce((total, b) => total + b.netBalance, 0);
      expect(sum).toBeCloseTo(0, 9);
    },
  );

  it.each(sampleData.groups.map((g) => [g.name, g] as const))(
    "%s: direct net balance matches the independently computed pairwise ledger",
    (_name, group) => {
      const { memberBalances, settlementSuggestions } = balancesForGroup(group);

      const pairwiseNetByMember = new Map<string, number>(
        group.members.map((m) => [m.id, 0]),
      );
      for (const s of settlementSuggestions) {
        pairwiseNetByMember.set(
          s.from,
          (pairwiseNetByMember.get(s.from) ?? 0) - s.amount,
        );
        pairwiseNetByMember.set(
          s.to,
          (pairwiseNetByMember.get(s.to) ?? 0) + s.amount,
        );
      }

      for (const balance of memberBalances) {
        expect(pairwiseNetByMember.get(balance.memberId) ?? 0).toBeCloseTo(
          balance.netBalance,
          2,
        );
      }
    },
  );

  it("matches the documented balance in data/README.md (Chloe owes Ben $14.37)", () => {
    const group = sampleData.groups.find(
      (g) => g.name === "Sarah's Birthday Present",
    )!;
    const { settlementSuggestions } = balancesForGroup(group);

    const chloeToBen = settlementSuggestions.find(
      (s) => s.from === "mem_chloe" && s.to === "mem_ben",
    );
    expect(chloeToBen?.amount).toBe(14.37);
  });

  it("flags exactly-zero balances as settled", () => {
    const group = sampleData.groups.find(
      (g) => g.name === "Sarah's Birthday Present",
    )!;
    const { memberBalances } = balancesForGroup(group);

    const settledIds = memberBalances
      .filter((b) => b.isSettled)
      .map((b) => b.memberId);
    expect(settledIds.sort()).toEqual(["mem_marcus", "mem_olivia"]);
  });

  it("treats a $0.01 residual as settled but $0.02 as a real balance", () => {
    const oneCent = calculateBalances({
      memberIds: ["a", "b"],
      expenses: [
        {
          paidBy: "a",
          currency: "USD",
          exchangeRate: 1,
          splits: [
            { memberId: "a", amount: 50 },
            { memberId: "b", amount: 50 },
          ],
        },
      ],
      settlements: [
        { from: "b", to: "a", currency: "USD", exchangeRate: 1, amount: 49.99 },
      ],
      groupCurrency: "USD",
    });
    expect(oneCent.memberBalances.every((b) => b.isSettled)).toBe(true);
    expect(oneCent.settlementSuggestions).toEqual([]);

    const twoCent = calculateBalances({
      memberIds: ["a", "b"],
      expenses: [
        {
          paidBy: "a",
          currency: "USD",
          exchangeRate: 1,
          splits: [
            { memberId: "a", amount: 50 },
            { memberId: "b", amount: 50 },
          ],
        },
      ],
      settlements: [
        { from: "b", to: "a", currency: "USD", exchangeRate: 1, amount: 49.98 },
      ],
      groupCurrency: "USD",
    });
    expect(twoCent.memberBalances.every((b) => !b.isSettled)).toBe(true);
    expect(twoCent.settlementSuggestions).toEqual([
      { from: "b", to: "a", amount: 0.02 },
    ]);
  });

  it("never suggests a member settle with themselves and never double-counts a pair", () => {
    const group = sampleData.groups.find((g) => g.name === "Camping Weekend")!;
    const { settlementSuggestions } = balancesForGroup(group);

    for (const s of settlementSuggestions) {
      expect(s.from).not.toBe(s.to);
    }

    const pairKeys = settlementSuggestions.map((s) =>
      [s.from, s.to].sort().join("|"),
    );
    expect(new Set(pairKeys).size).toBe(pairKeys.length);
  });
});
