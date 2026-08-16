import { beforeEach, describe, expect, it, vi } from "vitest";

const getCachedSession = vi.fn();
const groupFindFirst = vi.fn();
const groupFindUniqueOrThrow = vi.fn();
const groupUpdate = vi.fn();
const groupDelete = vi.fn();
const memberFindFirst = vi.fn();
const memberUpdate = vi.fn();

vi.mock("../auth", () => ({
  getCachedSession: (...args: unknown[]) => getCachedSession(...args),
}));

// $transaction just runs the callback against the same mocked methods —
// good enough here since these tests only assert on call args/results, not
// real transactional isolation.
const txClient = {
  group: {
    get findFirst() {
      return groupFindFirst;
    },
    get findUniqueOrThrow() {
      return groupFindUniqueOrThrow;
    },
    get update() {
      return groupUpdate;
    },
    get delete() {
      return groupDelete;
    },
  },
  member: {
    get findFirst() {
      return memberFindFirst;
    },
    get update() {
      return memberUpdate;
    },
  },
};

vi.mock("../prisma", () => ({
  prisma: {
    ...txClient,
    $transaction: (cb: (tx: typeof txClient) => unknown) => cb(txClient),
  },
}));

vi.mock("../email", () => ({
  sendAddedToGroupEmail: vi.fn(),
  sendGroupInviteEmail: vi.fn(),
}));

// Imported after the mocks above, same pattern as
// prisma-data-access.addMember.test.ts.
const { prismaDataAccess } = await import("./prisma-data-access");

function session(userId: string) {
  return { user: { id: userId, name: "Test User", email: `${userId}@example.com` } };
}

// Empty expenses/settlements → every member's balance is zero, so any
// balance-settled check downstream of the ownership/party check passes.
function settledGroup(memberIds: string[]) {
  return {
    currency: "USD",
    members: memberIds.map((id) => ({ id })),
    expenses: [],
    settlements: [],
  };
}

beforeEach(() => {
  getCachedSession.mockReset();
  groupFindFirst.mockReset();
  groupFindUniqueOrThrow.mockReset();
  groupUpdate.mockReset();
  groupDelete.mockReset();
  memberFindFirst.mockReset();
  memberUpdate.mockReset();
});

describe("updateGroup", () => {
  const input = { name: "New name", currency: "USD" as const };

  it("rejects a non-owner member", async () => {
    getCachedSession.mockResolvedValue(session("usr_member"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });

    await expect(
      prismaDataAccess.updateGroup("grp_1", input),
    ).rejects.toMatchObject({ code: "NOT_GROUP_OWNER" });
    expect(groupUpdate).not.toHaveBeenCalled();
  });

  it("allows the owner", async () => {
    getCachedSession.mockResolvedValue(session("usr_owner"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });
    groupUpdate.mockResolvedValue({
      id: "grp_1",
      name: "New name",
      description: null,
      currency: "USD",
      ownerId: "usr_owner",
      createdAt: new Date(),
    });

    const group = await prismaDataAccess.updateGroup("grp_1", input);
    expect(group.name).toBe("New name");
  });

  it("is permissive when the group has no owner on record", async () => {
    getCachedSession.mockResolvedValue(session("usr_member"));
    groupFindFirst.mockResolvedValue({ ownerId: null });
    groupUpdate.mockResolvedValue({
      id: "grp_1",
      name: "New name",
      description: null,
      currency: "USD",
      ownerId: null,
      createdAt: new Date(),
    });

    await expect(
      prismaDataAccess.updateGroup("grp_1", input),
    ).resolves.toMatchObject({ name: "New name" });
  });
});

describe("deleteGroup", () => {
  it("rejects a non-owner member", async () => {
    getCachedSession.mockResolvedValue(session("usr_member"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });

    await expect(prismaDataAccess.deleteGroup("grp_1")).rejects.toMatchObject(
      { code: "NOT_GROUP_OWNER" },
    );
    expect(groupDelete).not.toHaveBeenCalled();
  });

  it("allows the owner when balances are settled", async () => {
    getCachedSession.mockResolvedValue(session("usr_owner"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });
    groupFindUniqueOrThrow.mockResolvedValue(settledGroup(["mem_1"]));
    groupDelete.mockResolvedValue({});

    await prismaDataAccess.deleteGroup("grp_1");
    expect(groupDelete).toHaveBeenCalledWith({ where: { id: "grp_1" } });
  });
});

describe("removeMember", () => {
  it("rejects a non-owner member", async () => {
    getCachedSession.mockResolvedValue(session("usr_member"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });

    await expect(
      prismaDataAccess.removeMember("grp_1", "mem_target"),
    ).rejects.toMatchObject({ code: "NOT_GROUP_OWNER" });
    expect(memberUpdate).not.toHaveBeenCalled();
  });

  it("rejects the owner trying to remove their own membership", async () => {
    getCachedSession.mockResolvedValue(session("usr_owner"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });
    memberFindFirst.mockResolvedValue({
      id: "mem_owner",
      userId: "usr_owner",
      deletedAt: null,
    });

    await expect(
      prismaDataAccess.removeMember("grp_1", "mem_owner"),
    ).rejects.toMatchObject({ code: "OWNER_CANNOT_REMOVE_SELF" });
    expect(memberUpdate).not.toHaveBeenCalled();
  });

  it("allows the owner to remove another settled member", async () => {
    getCachedSession.mockResolvedValue(session("usr_owner"));
    groupFindFirst.mockResolvedValue({ ownerId: "usr_owner" });
    memberFindFirst.mockResolvedValue({
      id: "mem_target",
      userId: "usr_other",
      deletedAt: null,
    });
    groupFindUniqueOrThrow.mockResolvedValue(settledGroup(["mem_target"]));
    memberUpdate.mockResolvedValue({});

    await prismaDataAccess.removeMember("grp_1", "mem_target");
    expect(memberUpdate).toHaveBeenCalledWith({
      where: { id: "mem_target" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("createSettlement", () => {
  const baseInput = {
    from: "mem_a",
    to: "mem_b",
    amount: 10,
    currency: "USD" as const,
    exchangeRate: 1,
    date: new Date().toISOString(),
  };

  it("rejects a non-owner who isn't a party to the settlement", async () => {
    getCachedSession.mockResolvedValue(session("usr_bystander"));
    groupFindFirst.mockResolvedValue({
      ownerId: "usr_owner",
      members: [{ id: "mem_bystander" }],
    });

    await expect(
      prismaDataAccess.createSettlement("grp_1", baseInput),
    ).rejects.toMatchObject({ code: "NOT_SETTLEMENT_PARTY" });
  });

  it("allows a non-owner who is a party (payer) to the settlement", async () => {
    getCachedSession.mockResolvedValue(session("usr_a"));
    groupFindFirst.mockResolvedValue({
      ownerId: "usr_owner",
      members: [{ id: "mem_a" }],
    });
    groupFindUniqueOrThrow.mockResolvedValue(
      settledGroup(["mem_a", "mem_b"]),
    );

    // No debt exists in a fully-settled group, so passing the party check
    // surfaces as NO_DEBT_EXISTS rather than NOT_SETTLEMENT_PARTY.
    await expect(
      prismaDataAccess.createSettlement("grp_1", baseInput),
    ).rejects.toMatchObject({ code: "NO_DEBT_EXISTS" });
  });

  it("allows the owner regardless of being a party", async () => {
    getCachedSession.mockResolvedValue(session("usr_owner"));
    groupFindFirst.mockResolvedValue({
      ownerId: "usr_owner",
      members: [{ id: "mem_owner" }],
    });
    groupFindUniqueOrThrow.mockResolvedValue(
      settledGroup(["mem_a", "mem_b"]),
    );

    await expect(
      prismaDataAccess.createSettlement("grp_1", baseInput),
    ).rejects.toMatchObject({ code: "NO_DEBT_EXISTS" });
  });

  it("is permissive when the group has no owner on record", async () => {
    getCachedSession.mockResolvedValue(session("usr_bystander"));
    groupFindFirst.mockResolvedValue({
      ownerId: null,
      members: [{ id: "mem_bystander" }],
    });
    groupFindUniqueOrThrow.mockResolvedValue(
      settledGroup(["mem_a", "mem_b"]),
    );

    await expect(
      prismaDataAccess.createSettlement("grp_1", baseInput),
    ).rejects.toMatchObject({ code: "NO_DEBT_EXISTS" });
  });
});
