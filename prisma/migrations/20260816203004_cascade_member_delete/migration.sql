-- Deleting a group cascades to its members (member.groupId ON DELETE CASCADE),
-- but expense.paidById, split.memberId, and settlement.fromId/toId all
-- referenced member with the default ON DELETE RESTRICT. Postgres doesn't
-- guarantee cascade-delete ordering across a row's independent FK
-- relationships, so any group with expense or settlement history could hit
-- "violates RESTRICT setting" when deleting a member as part of the group
-- cascade — even though every expense/settlement in that same group is
-- also about to be cascade-deleted from the group itself. Switching these
-- to CASCADE lets the whole tree fall away together. Member rows are never
-- hard-deleted outside of a group delete (removeMember only soft-deletes
-- via deletedAt), so this can't unexpectedly nuke data through any other
-- code path today.

ALTER TABLE "expense" DROP CONSTRAINT "expense_paidById_fkey";
ALTER TABLE "expense" ADD CONSTRAINT "expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "split" DROP CONSTRAINT "split_memberId_fkey";
ALTER TABLE "split" ADD CONSTRAINT "split_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlement" DROP CONSTRAINT "settlement_fromId_fkey";
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlement" DROP CONSTRAINT "settlement_toId_fkey";
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_toId_fkey" FOREIGN KEY ("toId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
