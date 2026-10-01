/*
  Warnings:

  - You are about to drop the column `userId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RecurringRule` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `bookId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookId` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookId` to the `RecurringRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookType" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_userId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringRule" DROP CONSTRAINT "RecurringRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex
DROP INDEX "Account_userId_idx";

-- DropIndex
DROP INDEX "Budget_userId_month_idx";

-- DropIndex
DROP INDEX "Category_userId_type_idx";

-- DropIndex
DROP INDEX "Transaction_userId_categoryId_idx";

-- DropIndex
DROP INDEX "Transaction_userId_occurredAt_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "userId",
ADD COLUMN     "bookId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "userId",
ADD COLUMN     "bookId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "userId",
ADD COLUMN     "bookId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecurringRule" DROP COLUMN "userId",
ADD COLUMN     "bookId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "userId",
ADD COLUMN     "bookId" TEXT NOT NULL,
ADD COLUMN     "createdById" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BookType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookMember" (
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookMember_pkey" PRIMARY KEY ("bookId","userId")
);

-- CreateTable
CREATE TABLE "BookInvite" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookMember_userId_idx" ON "BookMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookInvite_code_key" ON "BookInvite"("code");

-- CreateIndex
CREATE INDEX "BookInvite_bookId_idx" ON "BookInvite"("bookId");

-- CreateIndex
CREATE INDEX "Account_bookId_idx" ON "Account"("bookId");

-- CreateIndex
CREATE INDEX "Budget_bookId_month_idx" ON "Budget"("bookId", "month");

-- CreateIndex
CREATE INDEX "Category_bookId_type_idx" ON "Category"("bookId", "type");

-- CreateIndex
CREATE INDEX "Transaction_bookId_occurredAt_idx" ON "Transaction"("bookId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_bookId_categoryId_idx" ON "Transaction"("bookId", "categoryId");

-- AddForeignKey
ALTER TABLE "BookMember" ADD CONSTRAINT "BookMember_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookMember" ADD CONSTRAINT "BookMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookInvite" ADD CONSTRAINT "BookInvite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookInvite" ADD CONSTRAINT "BookInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
