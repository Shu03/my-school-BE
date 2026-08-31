-- CreateEnum
CREATE TYPE "FeeRecordStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "FeeRecordStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_payments" (
    "id" TEXT NOT NULL,
    "feeRecordId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidOn" DATE NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_structures_academicYearId_idx" ON "fee_structures"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_gradeLevel_academicYearId_key" ON "fee_structures"("gradeLevel", "academicYearId");

-- CreateIndex
CREATE INDEX "fee_records_academicYearId_idx" ON "fee_records"("academicYearId");

-- CreateIndex
CREATE INDEX "fee_records_studentId_idx" ON "fee_records"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_records_studentId_academicYearId_key" ON "fee_records"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "fee_payments_feeRecordId_idx" ON "fee_payments"("feeRecordId");

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_feeRecordId_fkey" FOREIGN KEY ("feeRecordId") REFERENCES "fee_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
