-- AlterEnum
ALTER TYPE "GamePostStatus" ADD VALUE 'IN_PROGRESS';

-- DropForeignKey
ALTER TABLE "GameParticipant" DROP CONSTRAINT "GameParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "GamePost" DROP CONSTRAINT "GamePost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "WaitingParticipant" DROP CONSTRAINT "WaitingParticipant_userId_fkey";

-- AddForeignKey
ALTER TABLE "GamePost" ADD CONSTRAINT "GamePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipant" ADD CONSTRAINT "GameParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingParticipant" ADD CONSTRAINT "WaitingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
