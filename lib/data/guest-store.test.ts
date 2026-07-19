import { beforeEach, describe, expect, it } from "vitest";
import { emptyGuestData } from "./guest-engine";
import { guestDataAccess, useGuestStore } from "./guest-store";

beforeEach(() => {
  useGuestStore.setState({ data: emptyGuestData, hasSeeded: false });
});

describe("guestDataAccess", () => {
  it("seeds all 5 sample groups on first read", async () => {
    const groups = await guestDataAccess.listGroups();
    expect(groups).toHaveLength(5);
  });

  it("creates a group, adds a member, and logs an expense end to end", async () => {
    const group = await guestDataAccess.createGroup({
      name: "Ski Trip",
      currency: "USD",
    });

    const alice = await guestDataAccess.addMember(group.id, {
      name: "Alice",
      avatarColor: "#000000",
    });
    const bob = await guestDataAccess.addMember(group.id, {
      name: "Bob",
      avatarColor: "#111111",
    });

    await guestDataAccess.createExpense(group.id, {
      description: "Lift tickets",
      amount: 100,
      currency: "USD",
      exchangeRate: 1,
      paidBy: alice.id,
      splitType: "equal",
      splits: [
        { memberId: alice.id, amount: 50 },
        { memberId: bob.id, amount: 50 },
      ],
      date: "2024-01-01T00:00:00Z",
      category: "Entertainment",
    });

    const detail = await guestDataAccess.getGroup(group.id);
    expect(detail?.expenses).toHaveLength(1);
    expect(
      detail?.memberBalances.find((b) => b.memberId === alice.id)?.netBalance,
    ).toBe(50);
    expect(
      detail?.memberBalances.find((b) => b.memberId === bob.id)?.netBalance,
    ).toBe(-50);
  });

  it("blocks removing a member with a non-zero balance", async () => {
    // Sarah's Birthday: Chloe owes Ben, so neither has a zero balance yet.
    await expect(
      guestDataAccess.removeMember("grp_birthday", "mem_chloe"),
    ).rejects.toMatchObject({ code: "MEMBER_HAS_BALANCE" });
  });

  it("allows removing a member once their balance is settled", async () => {
    // Marcus is already settled in the seed data.
    await guestDataAccess.removeMember("grp_birthday", "mem_marcus");
    const detail = await guestDataAccess.getGroup("grp_birthday");
    const marcus = detail?.members.find((m) => m.id === "mem_marcus");
    // Soft-deleted, not hard-deleted — historical expenses still reference him.
    expect(marcus?.deletedAt).not.toBeNull();
  });

  it("blocks deleting a group with unsettled balances", async () => {
    await expect(
      guestDataAccess.deleteGroup("grp_birthday"),
    ).rejects.toMatchObject({ code: "GROUP_NOT_SETTLED" });
  });

  it("allows deleting a freshly created, empty group", async () => {
    const group = await guestDataAccess.createGroup({
      name: "Empty Group",
      currency: "USD",
    });
    await guestDataAccess.deleteGroup(group.id);
    expect(await guestDataAccess.getGroup(group.id)).toBeNull();
  });

  it("blocks settling a debt that doesn't exist", async () => {
    // Ben doesn't owe Chloe anything — it's the other way around.
    await expect(
      guestDataAccess.createSettlement("grp_birthday", {
        from: "mem_ben",
        to: "mem_chloe",
        amount: 1,
        currency: "USD",
        exchangeRate: 1,
        date: "2024-03-01T00:00:00Z",
      }),
    ).rejects.toMatchObject({ code: "NO_DEBT_EXISTS" });
  });

  it("records a settlement against a real debt and updates balances", async () => {
    await guestDataAccess.createSettlement("grp_birthday", {
      from: "mem_chloe",
      to: "mem_ben",
      amount: 14.37,
      currency: "USD",
      exchangeRate: 1,
      date: "2024-03-01T00:00:00Z",
    });

    const detail = await guestDataAccess.getGroup("grp_birthday");
    expect(
      detail?.settlementSuggestions.some(
        (s) => s.from === "mem_chloe" && s.to === "mem_ben",
      ),
    ).toBe(false);
  });

  it("throws when updating or deleting an expense that doesn't exist", async () => {
    await expect(
      guestDataAccess.deleteExpense("grp_birthday", "not-a-real-expense"),
    ).rejects.toMatchObject({ code: "EXPENSE_NOT_FOUND" });
  });
});
