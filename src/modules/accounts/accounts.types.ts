import { Prisma } from "@prisma/client";

export type AccountDepositBasic = Prisma.AccountDepositGetPayload<{
    include: {
        recordedBy: {
            omit: {
                password: true;
            };
        };
    };
}>;

type AccountWithdrawalPayload = Prisma.AccountWithdrawalGetPayload<{
    include: {
        recordedBy: {
            omit: {
                password: true;
            };
        };
    };
}>;

export type AccountWithdrawalBasic = AccountWithdrawalPayload & {
    spent: Prisma.Decimal;
    remaining: Prisma.Decimal;
};

export type AccountBillBasic = Prisma.AccountBillGetPayload<{
    include: {
        recordedBy: {
            omit: {
                password: true;
            };
        };
    };
}>;

export type AccountSummary = {
    totalDeposited: Prisma.Decimal;
    totalWithdrawn: Prisma.Decimal;
    totalSpent: Prisma.Decimal;
    totalBalance: Prisma.Decimal;
    withdrawnBalance: Prisma.Decimal;
};
