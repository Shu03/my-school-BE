-- CreateTable
CREATE TABLE "account_deposits" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "depositedOn" DATE NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_withdrawals" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "withdrawnOn" DATE NOT NULL,
    "withdrawnBy" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_bills" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "billedOn" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "billNumber" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_deposits_depositedOn_idx" ON "account_deposits"("depositedOn");

-- CreateIndex
CREATE INDEX "account_withdrawals_withdrawnOn_idx" ON "account_withdrawals"("withdrawnOn");

-- CreateIndex
CREATE INDEX "account_bills_withdrawalId_idx" ON "account_bills"("withdrawalId");

-- CreateIndex
CREATE INDEX "account_bills_billedOn_idx" ON "account_bills"("billedOn");

-- AddForeignKey
ALTER TABLE "account_deposits" ADD CONSTRAINT "account_deposits_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_withdrawals" ADD CONSTRAINT "account_withdrawals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_bills" ADD CONSTRAINT "account_bills_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "account_withdrawals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_bills" ADD CONSTRAINT "account_bills_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
