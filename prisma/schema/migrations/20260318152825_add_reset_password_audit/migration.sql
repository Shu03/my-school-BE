-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetPasswordAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordById" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_resetPasswordById_fkey" FOREIGN KEY ("resetPasswordById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
