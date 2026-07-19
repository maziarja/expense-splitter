/*
  Warnings:

  - You are about to drop the column `archivedAt` on the `member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "member" DROP COLUMN "archivedAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);
