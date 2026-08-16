import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { claimUnclaimedMemberships } from "./claim";

function fakeClient({
  unclaimed = [],
  updateImpl,
}: {
  unclaimed?: {
    id: string;
    groupId: string;
    group: { name: string };
  }[];
  updateImpl?: (args: { where: { id: string } }) => Promise<unknown>;
}) {
  const findMany = vi.fn().mockResolvedValue(unclaimed);
  const update = vi.fn(updateImpl ?? (async () => ({})));
  return {
    client: { member: { findMany, update } },
    findMany,
    update,
  };
}

function knownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "test",
  });
}

describe("claimUnclaimedMemberships", () => {
  it("links every unclaimed member row matching the user's email", async () => {
    const { client, findMany, update } = fakeClient({
      unclaimed: [
        { id: "mem_1", groupId: "grp_1", group: { name: "Trip" } },
        { id: "mem_2", groupId: "grp_2", group: { name: "Roomies" } },
      ],
    });

    const claimed = await claimUnclaimedMemberships(
      client as never,
      { id: "usr_1", email: "person@example.com" },
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        email: { equals: "person@example.com", mode: "insensitive" },
        userId: null,
        deletedAt: null,
      },
      select: { id: true, groupId: true, group: { select: { name: true } } },
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({
      where: { id: "mem_1" },
      data: { userId: "usr_1" },
    });
    expect(claimed).toEqual([
      { groupId: "grp_1", groupName: "Trip" },
      { groupId: "grp_2", groupName: "Roomies" },
    ]);
  });

  it("skips a row that would violate the group's one-membership-per-user constraint", async () => {
    const { client } = fakeClient({
      unclaimed: [
        { id: "mem_1", groupId: "grp_1", group: { name: "Trip" } },
        { id: "mem_2", groupId: "grp_2", group: { name: "Roomies" } },
      ],
      updateImpl: async ({ where }) => {
        if (where.id === "mem_1") throw knownRequestError("P2002");
        return {};
      },
    });

    const claimed = await claimUnclaimedMemberships(client as never, {
      id: "usr_1",
      email: "person@example.com",
    });

    expect(claimed).toEqual([{ groupId: "grp_2", groupName: "Roomies" }]);
  });

  it("rethrows unexpected errors instead of silently skipping", async () => {
    const { client } = fakeClient({
      unclaimed: [{ id: "mem_1", groupId: "grp_1", group: { name: "Trip" } }],
      updateImpl: async () => {
        throw new Error("connection lost");
      },
    });

    await expect(
      claimUnclaimedMemberships(client as never, {
        id: "usr_1",
        email: "person@example.com",
      }),
    ).rejects.toThrow("connection lost");
  });

  it("returns an empty list when nothing is unclaimed", async () => {
    const { client } = fakeClient({ unclaimed: [] });

    const claimed = await claimUnclaimedMemberships(client as never, {
      id: "usr_1",
      email: "nobody@example.com",
    });

    expect(claimed).toEqual([]);
  });
});
