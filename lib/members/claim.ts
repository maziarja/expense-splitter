import { Prisma, type PrismaClient } from "@/generated/prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

// Links every unclaimed Member row (added by email, never signed in) that
// matches this user's email to their account, so the groups they were added
// to before they had — or verified — an account start showing up for them.
// Updates one row at a time rather than a single updateMany: a row must be
// skipped, not fail the whole batch, if this user already has an active
// membership in that group some other way (Member's [groupId, userId]
// uniqueness would otherwise reject it).
export async function claimUnclaimedMemberships(
  client: PrismaLike,
  user: { id: string; email: string },
): Promise<{ groupId: string; groupName: string }[]> {
  const unclaimed = await client.member.findMany({
    where: {
      email: { equals: user.email, mode: "insensitive" },
      userId: null,
      deletedAt: null,
    },
    select: { id: true, groupId: true, group: { select: { name: true } } },
  });

  const claimed: { groupId: string; groupName: string }[] = [];
  for (const member of unclaimed) {
    try {
      await client.member.update({
        where: { id: member.id },
        data: { userId: user.id },
      });
      claimed.push({ groupId: member.groupId, groupName: member.group.name });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  return claimed;
}
