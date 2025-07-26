/*
  Warnings:

  - You are about to drop the column `isLeader` on the `GameParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `isReserve` on the `GameParticipant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gamePostId,guestName]` on the table `GameParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "WaitingStatus" AS ENUM ('WAITING', 'CONFIRMED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "GameParticipant" DROP CONSTRAINT "GameParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "GamePost" DROP CONSTRAINT "GamePost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "GamePost" DROP CONSTRAINT "GamePost_gameId_fkey";

-- DropIndex
DROP INDEX "GamePost_startTime_idx";

-- DropIndex
DROP INDEX "GamePost_status_idx";

-- AlterTable
ALTER TABLE "GameParticipant" DROP COLUMN "isLeader",
DROP COLUMN "isReserve",
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "participantType" "ParticipantType" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GamePost" ADD COLUMN     "customGameName" TEXT,
ALTER COLUMN "gameId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WaitingParticipant" (
    "id" TEXT NOT NULL,
    "gamePostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WaitingStatus" NOT NULL DEFAULT 'WAITING',
    "availableTime" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitingParticipant_gamePostId_requestedAt_idx" ON "WaitingParticipant"("gamePostId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaitingParticipant_gamePostId_userId_key" ON "WaitingParticipant"("gamePostId", "userId");

-- CreateIndex
CREATE INDEX "GameParticipant_gamePostId_idx" ON "GameParticipant"("gamePostId");

-- CreateIndex
CREATE INDEX "GameParticipant_userId_idx" ON "GameParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameParticipant_gamePostId_guestName_key" ON "GameParticipant"("gamePostId", "guestName");

-- CreateIndex
CREATE INDEX "GamePost_status_createdAt_idx" ON "GamePost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GamePost_status_startTime_idx" ON "GamePost"("status", "startTime");

-- AddForeignKey
ALTER TABLE "GamePost" ADD CONSTRAINT "GamePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePost" ADD CONSTRAINT "GamePost_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipant" ADD CONSTRAINT "GameParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingParticipant" ADD CONSTRAINT "WaitingParticipant_gamePostId_fkey" FOREIGN KEY ("gamePostId") REFERENCES "GamePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingParticipant" ADD CONSTRAINT "WaitingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
