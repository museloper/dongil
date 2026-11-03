-- AlterTable
ALTER TABLE "BookMember" ADD COLUMN     "defaultAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "BookMember" ADD CONSTRAINT "BookMember_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
