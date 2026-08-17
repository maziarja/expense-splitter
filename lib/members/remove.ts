import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

// Soft-deletes every active membership for a user being deleted, mirroring
// removeMember's deletedAt convention — but unconditional (no owner/balance
// gate), since this is the user voluntarily leaving, not being kicked out.
export async function removeUserMemberships(
  client: PrismaLike,
  userId: string,
): Promise<void> {
  await client.member.updateMany({
    where: { userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
