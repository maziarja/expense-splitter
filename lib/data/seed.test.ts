import { describe, expect, it } from "vitest";
import sampleData from "../../data/sample-groups.json";
import { calculateBalances } from "../splits/balance";
import type { CurrencyCode } from "../splits/constants";
import { toGroupDetail, toGroupSummary } from "./guest-engine";
import { buildSeedData } from "./seed";

// The balance math itself (rounding, sum-to-zero, the Chloe/Ben edge case)
// is already proven against this same sample data in
// lib/splits/balance.test.ts. This file checks the layer on top of it: does
// seeding sample-groups.json into GuestData and reading it back through
// toGroupDetail preserve that data and reproduce the same balances, or does
// something get lost/mangled in the transform.

describe("buildSeedData", () => {
  it("loads all 5 sample groups", () => {
    const { groups } = buildSeedData();
    expect(Object.keys(groups)).toHaveLength(5);
    expect(new Set(Object.values(groups).map((g) => g.name))).toEqual(
      new Set([
        "Trip to Japan",
        "Apartment 4B",
        "Office Lunch Crew",
        "Sarah's Birthday Present",
        "Camping Weekend",
      ]),
    );
  });

  it.each(sampleData.groups.map((g) => [g.name, g] as const))(
    "%s: member/expense/settlement counts match the source JSON",
    (_name, raw) => {
      const { groups } = buildSeedData();
      const seeded = groups[raw.id];
      expect(seeded.members).toHaveLength(raw.members.length);
      expect(seeded.expenses).toHaveLength(raw.expenses.length);
      expect(seeded.settlements).toHaveLength(raw.settlements.length);
    },
  );

  it("preserves Dev Okafor as a name-only member (no email)", () => {
    const { groups } = buildSeedData();
    const dev = groups["grp_camping"].members.find((m) => m.id === "mem_dev");
    expect(dev).toBeDefined();
    expect(dev?.email).toBeNull();
  });

  it.each(sampleData.groups.map((g) => [g.name, g] as const))(
    "%s: toGroupDetail balances match calculateBalances run directly on the source JSON",
    (_name, raw) => {
      const { groups } = buildSeedData();
      const detail = toGroupDetail(groups[raw.id]);

      const direct = calculateBalances({
        memberIds: raw.members.map((m) => m.id),
        expenses: raw.expenses.map((e) => ({
          paidBy: e.paidBy,
          currency: e.currency as CurrencyCode,
          exchangeRate: e.exchangeRate,
          splits: e.splits.map((s) => ({
            memberId: s.memberId,
            amount: s.amount,
          })),
        })),
        settlements: raw.settlements.map((s) => ({
          from: s.from,
          to: s.to,
          currency: s.currency as CurrencyCode,
          exchangeRate: s.exchangeRate,
          amount: s.amount,
        })),
        groupCurrency: raw.currency as CurrencyCode,
      });

      expect(detail.memberBalances).toEqual(direct.memberBalances);
      expect(detail.settlementSuggestions).toEqual(
        direct.settlementSuggestions,
      );
    },
  );

  it.each(sampleData.groups.map((g) => [g.name, g] as const))(
    "%s: toGroupSummary's yourBalance is the first member's balance (guest-mode convention)",
    (_name, raw) => {
      const { groups } = buildSeedData();
      const summary = toGroupSummary(groups[raw.id]);
      const firstMemberId = raw.members[0].id;
      const expected =
        summary.memberBalances.find((b) => b.memberId === firstMemberId) ??
        null;
      expect(summary.yourBalance).toEqual(expected);
      expect(summary.yourBalance?.memberId).toBe(firstMemberId);
    },
  );

  it("reproduces the documented Sarah's Birthday balance (Chloe owes Ben $14.37)", () => {
    const { groups } = buildSeedData();
    const detail = toGroupDetail(groups["grp_birthday"]);
    const chloeToBen = detail.settlementSuggestions.find(
      (s) => s.from === "mem_chloe" && s.to === "mem_ben",
    );
    expect(chloeToBen?.amount).toBe(14.37);
  });
});
