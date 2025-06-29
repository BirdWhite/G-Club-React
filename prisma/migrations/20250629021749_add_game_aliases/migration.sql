/*
  Warnings:

  - You are about to drop the `GameAlias` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GameAlias" DROP CONSTRAINT "GameAlias_gameId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "aliases" TEXT[];

-- DropTable
DROP TABLE "GameAlias";
