/*
  Warnings:

  - You are about to drop the column `isClosed` on the `GamePost` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "GamePostStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED');

-- AlterTable
ALTER TABLE "GamePost" DROP COLUMN "isClosed",
ADD COLUMN     "status" "GamePostStatus" NOT NULL DEFAULT 'OPEN';
