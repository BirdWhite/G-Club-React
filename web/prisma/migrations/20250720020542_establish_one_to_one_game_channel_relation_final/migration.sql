/*
  Warnings:

  - You are about to drop the column `gameDateTime` on the `GamePost` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gameId]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startTime` to the `GamePost` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `content` on the `GamePost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `content` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "GamePost_gameDateTime_idx";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "gameId" TEXT;

-- AlterTable
ALTER TABLE "GamePost" DROP COLUMN "gameDateTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_gameId_key" ON "Channel"("gameId");

-- CreateIndex
CREATE INDEX "GamePost_startTime_idx" ON "GamePost"("startTime");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
