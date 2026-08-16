-- AlterTable
ALTER TABLE "group" ADD COLUMN "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every real Group row was created via createGroup, which always
-- inserts the creator as a Member with userId set in the same call — so the
-- earliest Member row (by createdAt, tie-broken by id) that still has a
-- linked userId is the best-available stand-in for "who created this."
-- Restricted to still-active members (deletedAt IS NULL): the creator's own
-- row can have since been removed from the group, and an ownerId pointing
-- at someone with no active membership would lock every owner-only action
-- for that group permanently, with no way to recover it.
UPDATE "group" g
SET "ownerId" = (
  SELECT m."userId" FROM "member" m
  WHERE m."groupId" = g.id AND m."userId" IS NOT NULL AND m."deletedAt" IS NULL
  ORDER BY m."createdAt" ASC, m.id ASC
  LIMIT 1
);
