/*
  Warnings:

  - You are about to drop the column `isPrivate` on the `Channel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "isPrivate",
ADD COLUMN     "boardActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chatActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");
