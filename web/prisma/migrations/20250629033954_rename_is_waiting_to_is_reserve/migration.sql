/*
  Warnings:

  - You are about to drop the column `isWaiting` on the `GameParticipant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameParticipant" DROP COLUMN "isWaiting",
ADD COLUMN     "isReserve" BOOLEAN NOT NULL DEFAULT false;
