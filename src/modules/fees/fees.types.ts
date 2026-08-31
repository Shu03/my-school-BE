import { Prisma } from "@prisma/client";

export type FeeStructureBasic = Prisma.FeeStructureGetPayload<{
    include: {
        academicYear: true;
    };
}>;

type FeeRecordPayload = Prisma.FeeRecordGetPayload<{
    include: {
        student: {
            include: {
                user: {
                    omit: {
                        password: true;
                    };
                };
            };
        };
        feeStructure: true;
    };
}>;

export type FeeRecordBasic = FeeRecordPayload & {
    amountPaid: number;
};

export type FeePaymentBasic = Prisma.FeePaymentGetPayload<{
    include: {
        recordedBy: {
            omit: {
                password: true;
            };
        };
    };
}>;

export type FeeRecordWithPayments = FeeRecordBasic & {
    payments: FeePaymentBasic[];
};

export type BackfillResult = {
    created: number;
    skipped: number;
};
