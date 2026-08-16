import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const getCachedSession = vi.fn();
const memberFindFirst = vi.fn();
const memberCreate = vi.fn();
const userFindFirst = vi.fn();
const groupFindUniqueOrThrow = vi.fn();
const sendAddedToGroupEmail = vi.fn();
const sendGroupInviteEmail = vi.fn();

vi.mock("../auth", () => ({
  getCachedSession: (...args: unknown[]) => getCachedSession(...args),
}));

vi.mock("../prisma", () => ({
  prisma: {
    member: {
      get findFirst() {
        return memberFindFirst;
      },
      get create() {
        return memberCreate;
      },
    },
    user: {
      get findFirst() {
        return userFindFirst;
      },
    },
    group: {
      get findUniqueOrThrow() {
        return groupFindUniqueOrThrow;
      },
    },
  },
}));

vi.mock("../email", () => ({
  sendAddedToGroupEmail: (...args: unknown[]) =>
    sendAddedToGroupEmail(...args),
  sendGroupInviteEmail: (...args: unknown[]) => sendGroupInviteEmail(...args),
}));

// Imported after the mocks above so prismaDataAccess picks up the mocked
// `getCachedSession`/`prisma`/email-send bindings rather than the real
// modules (same pattern as lib/exchange-rate/cache.test.ts).
const { prismaDataAccess } = await import("./prisma-data-access");

function session(user: { id: string; name: string }) {
  return { user: { ...user, email: `${user.id}@example.com` } };
}

function knownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "test",
  });
}

const input = {
  name: "Sam",
  email: "sam@example.com",
  avatarColor: "#111111",
};

// `member.findFirst` backs two different queries in addMember: the
// membership check (where.userId is set) and the duplicate-email check
// (where.email is set, no userId) — distinguish them by shape rather than
// call order, since not every test path reaches the second one.
function mockMemberFindFirst({
  isMember = true,
  duplicateEmailMember = null,
}: {
  isMember?: boolean;
  duplicateEmailMember?: { id: string } | null;
}) {
  memberFindFirst.mockImplementation(
    async ({ where }: { where: { userId?: string; email?: unknown } }) => {
      if (where.userId !== undefined) {
        return isMember ? { id: "mem_owner" } : null;
      }
      return duplicateEmailMember;
    },
  );
}

describe("addMember", () => {
  beforeEach(() => {
    getCachedSession.mockReset();
    memberFindFirst.mockReset();
    memberCreate.mockReset();
    userFindFirst.mockReset();
    groupFindUniqueOrThrow.mockReset();
    sendAddedToGroupEmail.mockReset().mockResolvedValue(undefined);
    sendGroupInviteEmail.mockReset().mockResolvedValue(undefined);

    getCachedSession.mockResolvedValue(
      session({ id: "usr_owner", name: "Owner" }),
    );
    mockMemberFindFirst({});
  });

  it("links immediately and emails 'added' when the email matches an existing user", async () => {
    userFindFirst.mockResolvedValue({
      id: "usr_sam",
      email: "sam@example.com",
    });
    memberCreate.mockResolvedValue({
      id: "mem_sam",
      groupId: "grp_1",
      userId: "usr_sam",
      name: "Sam",
      email: "sam@example.com",
      avatarColor: "#111111",
      deletedAt: null,
    });
    groupFindUniqueOrThrow.mockResolvedValue({ name: "Trip" });

    const member = await prismaDataAccess.addMember("grp_1", input);

    expect(member.userId).toBe("usr_sam");
    expect(memberCreate).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: "grp_1" } },
        user: { connect: { id: "usr_sam" } },
        name: "Sam",
        email: "sam@example.com",
        avatarColor: "#111111",
      },
    });
    expect(sendAddedToGroupEmail).toHaveBeenCalledWith("sam@example.com", {
      groupName: "Trip",
      inviterName: "Owner",
      groupId: "grp_1",
    });
    expect(sendGroupInviteEmail).not.toHaveBeenCalled();
  });

  it("creates an unlinked member and sends an invite email when no account matches", async () => {
    userFindFirst.mockResolvedValue(null);
    memberCreate.mockResolvedValue({
      id: "mem_sam",
      groupId: "grp_1",
      userId: null,
      name: "Sam",
      email: "sam@example.com",
      avatarColor: "#111111",
      deletedAt: null,
    });
    groupFindUniqueOrThrow.mockResolvedValue({ name: "Trip" });

    const member = await prismaDataAccess.addMember("grp_1", input);

    expect(member.userId).toBeNull();
    expect(memberCreate).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: "grp_1" } },
        name: "Sam",
        email: "sam@example.com",
        avatarColor: "#111111",
      },
    });
    expect(sendGroupInviteEmail).toHaveBeenCalledWith("sam@example.com", {
      groupName: "Trip",
      inviterName: "Owner",
    });
    expect(sendAddedToGroupEmail).not.toHaveBeenCalled();
  });

  it("skips the email lookup and any notification when no email is given", async () => {
    memberCreate.mockResolvedValue({
      id: "mem_sam",
      groupId: "grp_1",
      userId: null,
      name: "Sam",
      email: null,
      avatarColor: "#111111",
      deletedAt: null,
    });

    await prismaDataAccess.addMember("grp_1", {
      name: "Sam",
      avatarColor: "#111111",
    });

    expect(userFindFirst).not.toHaveBeenCalled();
    expect(groupFindUniqueOrThrow).not.toHaveBeenCalled();
    expect(sendAddedToGroupEmail).not.toHaveBeenCalled();
    expect(sendGroupInviteEmail).not.toHaveBeenCalled();
  });

  it("throws MEMBER_ALREADY_LINKED when the matched user is already an active member of the group", async () => {
    userFindFirst.mockResolvedValue({
      id: "usr_sam",
      email: "sam@example.com",
    });
    memberCreate.mockRejectedValue(knownRequestError("P2002"));

    await expect(
      prismaDataAccess.addMember("grp_1", input),
    ).rejects.toMatchObject({ code: "MEMBER_ALREADY_LINKED" });
    expect(sendAddedToGroupEmail).not.toHaveBeenCalled();
  });

  it("throws MEMBER_EMAIL_TAKEN when another active member already has this email, even unclaimed", async () => {
    mockMemberFindFirst({ duplicateEmailMember: { id: "mem_existing" } });

    await expect(
      prismaDataAccess.addMember("grp_1", input),
    ).rejects.toMatchObject({ code: "MEMBER_EMAIL_TAKEN" });
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it("matches the duplicate-email check case-insensitively", async () => {
    mockMemberFindFirst({ duplicateEmailMember: { id: "mem_existing" } });

    await expect(
      prismaDataAccess.addMember("grp_1", { ...input, email: "SAM@Example.com" }),
    ).rejects.toMatchObject({ code: "MEMBER_EMAIL_TAKEN" });
  });

  it("allows re-adding an email that only belongs to a removed (soft-deleted) member", async () => {
    // duplicateEmailMember stays null because the mocked query itself
    // filters deletedAt: null — nothing further to configure here beyond
    // the default mockMemberFindFirst({}) from beforeEach.
    userFindFirst.mockResolvedValue(null);
    memberCreate.mockResolvedValue({
      id: "mem_new",
      groupId: "grp_1",
      userId: null,
      name: "Sam",
      email: "sam@example.com",
      avatarColor: "#111111",
      deletedAt: null,
    });
    groupFindUniqueOrThrow.mockResolvedValue({ name: "Trip" });

    await expect(
      prismaDataAccess.addMember("grp_1", input),
    ).resolves.toMatchObject({ id: "mem_new" });
  });
});
