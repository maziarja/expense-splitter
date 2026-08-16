// One-time backfill for the "auto-link members by email" feature: links
// unclaimed Member rows to Users who already had an account before this
// feature shipped (so neither the add-member lookup nor the sign-up hook
// ever ran for that pairing). Safe to re-run — already-claimed rows are
// skipped by claimUnclaimedMemberships.
//
// Usage: npm run backfill:member-claims
import "dotenv/config";
import { sendAddedToGroupEmail } from "../lib/email";
import { claimUnclaimedMemberships } from "../lib/members/claim";
import { prisma } from "../lib/prisma";

async function main() {
  const unclaimedEmails = await prisma.member.findMany({
    where: { userId: null, deletedAt: null, email: { not: null } },
    select: { email: true },
    distinct: ["email"],
  });

  let claimedCount = 0;
  for (const { email } of unclaimedEmails) {
    if (!email) continue;
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) continue;

    const claimed = await claimUnclaimedMemberships(prisma, user);
    for (const group of claimed) {
      console.log(
        `Linked ${user.email} to group "${group.groupName}" (${group.groupId})`,
      );
      await sendAddedToGroupEmail(user.email, {
        groupName: group.groupName,
        groupId: group.groupId,
        inviterName: null,
      }).catch((err) =>
        console.error(`Failed to email ${user.email}`, err),
      );
    }
    claimedCount += claimed.length;
  }

  console.log(`Done. Linked ${claimedCount} membership(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
