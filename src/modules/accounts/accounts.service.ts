import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_LIMIT,
    ERROR_ACCOUNT_BILL_EXCEEDS_WITHDRAWAL,
    ERROR_ACCOUNT_BILL_NOT_FOUND,
    ERROR_ACCOUNT_DEPOSIT_NOT_FOUND,
    ERROR_ACCOUNT_DEPOSITS_BELOW_WITHDRAWN,
    ERROR_ACCOUNT_INSUFFICIENT_BALANCE,
    ERROR_ACCOUNT_WITHDRAWAL_BELOW_SPENT,
    ERROR_ACCOUNT_WITHDRAWAL_NOT_FOUND,
    ERROR_NO_FIELDS_TO_UPDATE,
} from "@common/constants";

import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma";

import {
    AccountBillBasic,
    AccountDepositBasic,
    AccountSummary,
    AccountWithdrawalBasic,
} from "./accounts.types";
import {
    CreateBillDto,
    CreateDepositDto,
    CreateWithdrawalDto,
    ListAccountEntriesDto,
    ListBillsDto,
    UpdateBillDto,
    UpdateDepositDto,
    UpdateWithdrawalDto,
} from "./dto";

const ACCOUNT_DEPOSIT_INCLUDE = {
    recordedBy: {
        omit: { password: true },
    },
} satisfies Prisma.AccountDepositInclude;

const ACCOUNT_WITHDRAWAL_INCLUDE = {
    recordedBy: {
        omit: { password: true },
    },
} satisfies Prisma.AccountWithdrawalInclude;

const ACCOUNT_BILL_INCLUDE = {
    recordedBy: {
        omit: { password: true },
    },
} satisfies Prisma.AccountBillInclude;

// Arbitrary app-wide key; serialises balance-checked writes across concurrent requests.
const ACCOUNTS_ADVISORY_LOCK_KEY = 7_310_001;

type AccountWithdrawalPayload = Prisma.AccountWithdrawalGetPayload<{
    include: typeof ACCOUNT_WITHDRAWAL_INCLUDE;
}>;

@Injectable()
export class AccountsService {
    public constructor(private readonly prisma: PrismaService) {}

    // ─── Private Helpers ─────────────────────────────────────────────────────────

    private async acquireLock(tx: Prisma.TransactionClient): Promise<void> {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACCOUNTS_ADVISORY_LOCK_KEY}::bigint)`;
    }

    private isEmptyUpdate(dto: object): boolean {
        return Object.values(dto).every((value) => value === undefined);
    }

    private buildDateFilter(
        startDate?: string,
        endDate?: string,
    ): Prisma.DateTimeFilter | undefined {
        if (startDate === undefined && endDate === undefined) {
            return undefined;
        }

        return {
            ...(startDate !== undefined && { gte: new Date(startDate) }),
            ...(endDate !== undefined && { lte: new Date(endDate) }),
        };
    }

    private async sumDeposits(tx: Prisma.TransactionClient): Promise<Prisma.Decimal> {
        const aggregate = await tx.accountDeposit.aggregate({ _sum: { amount: true } });
        return aggregate._sum.amount ?? new Prisma.Decimal(0);
    }

    private async sumWithdrawals(
        tx: Prisma.TransactionClient,
        where: Prisma.AccountWithdrawalWhereInput = {},
    ): Promise<Prisma.Decimal> {
        const aggregate = await tx.accountWithdrawal.aggregate({
            where,
            _sum: { amount: true },
        });
        return aggregate._sum.amount ?? new Prisma.Decimal(0);
    }

    private async sumBills(
        tx: Prisma.TransactionClient,
        where: Prisma.AccountBillWhereInput = {},
    ): Promise<Prisma.Decimal> {
        const aggregate = await tx.accountBill.aggregate({
            where,
            _sum: { amount: true },
        });
        return aggregate._sum.amount ?? new Prisma.Decimal(0);
    }

    private async assertDepositExists(
        id: string,
        tx: Prisma.TransactionClient = this.prisma,
    ): Promise<AccountDepositBasic> {
        const deposit = await tx.accountDeposit.findUnique({
            where: { id },
            include: ACCOUNT_DEPOSIT_INCLUDE,
        });

        if (!deposit) {
            throw new NotFoundException(ERROR_ACCOUNT_DEPOSIT_NOT_FOUND);
        }

        return deposit;
    }

    private async assertWithdrawalExists(
        id: string,
        tx: Prisma.TransactionClient = this.prisma,
    ): Promise<AccountWithdrawalPayload> {
        const withdrawal = await tx.accountWithdrawal.findUnique({
            where: { id },
            include: ACCOUNT_WITHDRAWAL_INCLUDE,
        });

        if (!withdrawal) {
            throw new NotFoundException(ERROR_ACCOUNT_WITHDRAWAL_NOT_FOUND);
        }

        return withdrawal;
    }

    private async assertBillExists(
        id: string,
        tx: Prisma.TransactionClient = this.prisma,
    ): Promise<AccountBillBasic> {
        const bill = await tx.accountBill.findUnique({
            where: { id },
            include: ACCOUNT_BILL_INCLUDE,
        });

        if (!bill) {
            throw new NotFoundException(ERROR_ACCOUNT_BILL_NOT_FOUND);
        }

        return bill;
    }

    private async assertDepositsCoverWithdrawals(
        tx: Prisma.TransactionClient,
        depositDelta: Prisma.Decimal,
    ): Promise<void> {
        const totalDeposited = await this.sumDeposits(tx);
        const totalWithdrawn = await this.sumWithdrawals(tx);

        if (totalDeposited.plus(depositDelta).lessThan(totalWithdrawn)) {
            throw new BadRequestException(
                ERROR_ACCOUNT_DEPOSITS_BELOW_WITHDRAWN.replace("%s", totalWithdrawn.toFixed(2)),
            );
        }
    }

    private async assertBalanceAvailable(
        tx: Prisma.TransactionClient,
        amount: number,
        excludeWithdrawalId?: string,
    ): Promise<void> {
        const totalDeposited = await this.sumDeposits(tx);
        const totalWithdrawn = await this.sumWithdrawals(
            tx,
            excludeWithdrawalId !== undefined ? { id: { not: excludeWithdrawalId } } : {},
        );
        const available = totalDeposited.minus(totalWithdrawn);

        if (available.lessThan(amount)) {
            throw new BadRequestException(
                ERROR_ACCOUNT_INSUFFICIENT_BALANCE.replace("%s", available.toFixed(2)),
            );
        }
    }

    private async assertWithdrawalCoversBills(
        tx: Prisma.TransactionClient,
        withdrawalId: string,
        amount: number,
    ): Promise<void> {
        const spent = await this.sumBills(tx, { withdrawalId });

        if (spent.greaterThan(amount)) {
            throw new BadRequestException(
                ERROR_ACCOUNT_WITHDRAWAL_BELOW_SPENT.replace("%s", spent.toFixed(2)),
            );
        }
    }

    private async assertWithdrawalHasRoom(
        tx: Prisma.TransactionClient,
        withdrawal: AccountWithdrawalPayload,
        amount: number | Prisma.Decimal,
        excludeBillId?: string,
    ): Promise<void> {
        const spent = await this.sumBills(tx, {
            withdrawalId: withdrawal.id,
            ...(excludeBillId !== undefined && { id: { not: excludeBillId } }),
        });
        const remaining = withdrawal.amount.minus(spent);

        if (remaining.lessThan(amount)) {
            throw new BadRequestException(
                ERROR_ACCOUNT_BILL_EXCEEDS_WITHDRAWAL.replace("%s", remaining.toFixed(2)),
            );
        }
    }

    private async attachWithdrawalBalances(
        withdrawals: AccountWithdrawalPayload[],
    ): Promise<AccountWithdrawalBasic[]> {
        if (withdrawals.length === 0) {
            return [];
        }

        const grouped = await this.prisma.accountBill.groupBy({
            by: ["withdrawalId"],
            where: { withdrawalId: { in: withdrawals.map((withdrawal) => withdrawal.id) } },
            _sum: { amount: true },
        });

        const spentByWithdrawalId = new Map<string, Prisma.Decimal>(
            grouped.map((group) => [
                group.withdrawalId,
                group._sum.amount ?? new Prisma.Decimal(0),
            ]),
        );

        return withdrawals.map((withdrawal) => {
            const spent = spentByWithdrawalId.get(withdrawal.id) ?? new Prisma.Decimal(0);
            return { ...withdrawal, spent, remaining: withdrawal.amount.minus(spent) };
        });
    }

    // ─── Summary ─────────────────────────────────────────────────────────────────

    public async getSummary(): Promise<AccountSummary> {
        const [deposits, withdrawals, bills] = await this.prisma.$transaction([
            this.prisma.accountDeposit.aggregate({ _sum: { amount: true } }),
            this.prisma.accountWithdrawal.aggregate({ _sum: { amount: true } }),
            this.prisma.accountBill.aggregate({ _sum: { amount: true } }),
        ]);

        const totalDeposited = deposits._sum.amount ?? new Prisma.Decimal(0);
        const totalWithdrawn = withdrawals._sum.amount ?? new Prisma.Decimal(0);
        const totalSpent = bills._sum.amount ?? new Prisma.Decimal(0);

        return {
            totalDeposited,
            totalWithdrawn,
            totalSpent,
            totalBalance: totalDeposited.minus(totalWithdrawn),
            withdrawnBalance: totalWithdrawn.minus(totalSpent),
        };
    }

    // ─── Deposits ────────────────────────────────────────────────────────────────

    public async createDeposit(
        dto: CreateDepositDto,
        requestingUser: JwtPayload,
    ): Promise<AccountDepositBasic> {
        return this.prisma.accountDeposit.create({
            data: {
                amount: dto.amount,
                depositedOn: new Date(dto.depositedOn),
                note: dto.note ?? null,
                recordedById: requestingUser.sub,
            },
            include: ACCOUNT_DEPOSIT_INCLUDE,
        });
    }

    public async findAllDeposits(
        dto: ListAccountEntriesDto,
    ): Promise<{ data: AccountDepositBasic[]; total: number; page: number; limit: number }> {
        const page = dto.page ?? DEFAULT_PAGE;
        const limit = dto.limit ?? DEFAULT_PAGE_LIMIT;
        const dateFilter = this.buildDateFilter(dto.startDate, dto.endDate);

        const where: Prisma.AccountDepositWhereInput = {
            ...(dateFilter && { depositedOn: dateFilter }),
        };

        const [data, total] = await this.prisma.$transaction([
            this.prisma.accountDeposit.findMany({
                where,
                include: ACCOUNT_DEPOSIT_INCLUDE,
                orderBy: [{ depositedOn: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.accountDeposit.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async findOneDeposit(id: string): Promise<AccountDepositBasic> {
        return this.assertDepositExists(id);
    }

    public async updateDeposit(id: string, dto: UpdateDepositDto): Promise<AccountDepositBasic> {
        if (this.isEmptyUpdate(dto)) {
            throw new BadRequestException(ERROR_NO_FIELDS_TO_UPDATE);
        }

        return this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            const deposit = await this.assertDepositExists(id, tx);

            if (dto.amount !== undefined) {
                await this.assertDepositsCoverWithdrawals(
                    tx,
                    new Prisma.Decimal(dto.amount).minus(deposit.amount),
                );
            }

            return tx.accountDeposit.update({
                where: { id },
                data: {
                    ...(dto.amount !== undefined && { amount: dto.amount }),
                    ...(dto.depositedOn !== undefined && {
                        depositedOn: new Date(dto.depositedOn),
                    }),
                    ...(dto.note !== undefined && { note: dto.note }),
                },
                include: ACCOUNT_DEPOSIT_INCLUDE,
            });
        });
    }

    public async deleteDeposit(id: string): Promise<AccountDepositBasic> {
        return this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            const deposit = await this.assertDepositExists(id, tx);

            await this.assertDepositsCoverWithdrawals(tx, deposit.amount.negated());

            await tx.accountDeposit.delete({ where: { id } });

            return deposit;
        });
    }

    // ─── Withdrawals ─────────────────────────────────────────────────────────────

    public async createWithdrawal(
        dto: CreateWithdrawalDto,
        requestingUser: JwtPayload,
    ): Promise<AccountWithdrawalBasic> {
        const withdrawal = await this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            await this.assertBalanceAvailable(tx, dto.amount);

            return tx.accountWithdrawal.create({
                data: {
                    amount: dto.amount,
                    withdrawnOn: new Date(dto.withdrawnOn),
                    withdrawnBy: dto.withdrawnBy ?? null,
                    note: dto.note ?? null,
                    recordedById: requestingUser.sub,
                },
                include: ACCOUNT_WITHDRAWAL_INCLUDE,
            });
        });

        return { ...withdrawal, spent: new Prisma.Decimal(0), remaining: withdrawal.amount };
    }

    public async findAllWithdrawals(
        dto: ListAccountEntriesDto,
    ): Promise<{ data: AccountWithdrawalBasic[]; total: number; page: number; limit: number }> {
        const page = dto.page ?? DEFAULT_PAGE;
        const limit = dto.limit ?? DEFAULT_PAGE_LIMIT;
        const dateFilter = this.buildDateFilter(dto.startDate, dto.endDate);

        const where: Prisma.AccountWithdrawalWhereInput = {
            ...(dateFilter && { withdrawnOn: dateFilter }),
        };

        const [withdrawals, total] = await this.prisma.$transaction([
            this.prisma.accountWithdrawal.findMany({
                where,
                include: ACCOUNT_WITHDRAWAL_INCLUDE,
                orderBy: [{ withdrawnOn: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.accountWithdrawal.count({ where }),
        ]);

        const data = await this.attachWithdrawalBalances(withdrawals);

        return { data, total, page, limit };
    }

    public async findOneWithdrawal(id: string): Promise<AccountWithdrawalBasic> {
        const withdrawal = await this.assertWithdrawalExists(id);
        const [withBalances] = await this.attachWithdrawalBalances([withdrawal]);
        return withBalances;
    }

    public async updateWithdrawal(
        id: string,
        dto: UpdateWithdrawalDto,
    ): Promise<AccountWithdrawalBasic> {
        if (this.isEmptyUpdate(dto)) {
            throw new BadRequestException(ERROR_NO_FIELDS_TO_UPDATE);
        }

        await this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            await this.assertWithdrawalExists(id, tx);

            if (dto.amount !== undefined) {
                await this.assertBalanceAvailable(tx, dto.amount, id);
                await this.assertWithdrawalCoversBills(tx, id, dto.amount);
            }

            await tx.accountWithdrawal.update({
                where: { id },
                data: {
                    ...(dto.amount !== undefined && { amount: dto.amount }),
                    ...(dto.withdrawnOn !== undefined && {
                        withdrawnOn: new Date(dto.withdrawnOn),
                    }),
                    ...(dto.withdrawnBy !== undefined && { withdrawnBy: dto.withdrawnBy }),
                    ...(dto.note !== undefined && { note: dto.note }),
                },
            });
        });

        return this.findOneWithdrawal(id);
    }

    public async deleteWithdrawal(id: string): Promise<AccountWithdrawalBasic> {
        const withdrawal = await this.findOneWithdrawal(id);

        await this.prisma.accountWithdrawal.delete({ where: { id } });

        return withdrawal;
    }

    // ─── Bills ───────────────────────────────────────────────────────────────────

    public async createBill(
        dto: CreateBillDto,
        requestingUser: JwtPayload,
    ): Promise<AccountBillBasic> {
        return this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            const withdrawal = await this.assertWithdrawalExists(dto.withdrawalId, tx);
            await this.assertWithdrawalHasRoom(tx, withdrawal, dto.amount);

            return tx.accountBill.create({
                data: {
                    withdrawalId: dto.withdrawalId,
                    amount: dto.amount,
                    billedOn: new Date(dto.billedOn),
                    category: dto.category,
                    vendor: dto.vendor ?? null,
                    billNumber: dto.billNumber ?? null,
                    note: dto.note ?? null,
                    recordedById: requestingUser.sub,
                },
                include: ACCOUNT_BILL_INCLUDE,
            });
        });
    }

    public async findAllBills(
        dto: ListBillsDto,
    ): Promise<{ data: AccountBillBasic[]; total: number; page: number; limit: number }> {
        const page = dto.page ?? DEFAULT_PAGE;
        const limit = dto.limit ?? DEFAULT_PAGE_LIMIT;
        const dateFilter = this.buildDateFilter(dto.startDate, dto.endDate);

        const where: Prisma.AccountBillWhereInput = {
            ...(dateFilter && { billedOn: dateFilter }),
            ...(dto.withdrawalId !== undefined && { withdrawalId: dto.withdrawalId }),
        };

        const [data, total] = await this.prisma.$transaction([
            this.prisma.accountBill.findMany({
                where,
                include: ACCOUNT_BILL_INCLUDE,
                orderBy: [{ billedOn: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.accountBill.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async findOneBill(id: string): Promise<AccountBillBasic> {
        return this.assertBillExists(id);
    }

    public async updateBill(id: string, dto: UpdateBillDto): Promise<AccountBillBasic> {
        if (this.isEmptyUpdate(dto)) {
            throw new BadRequestException(ERROR_NO_FIELDS_TO_UPDATE);
        }

        return this.prisma.$transaction(async (tx) => {
            await this.acquireLock(tx);
            const bill = await this.assertBillExists(id, tx);

            if (dto.amount !== undefined || dto.withdrawalId !== undefined) {
                const targetWithdrawal = await this.assertWithdrawalExists(
                    dto.withdrawalId ?? bill.withdrawalId,
                    tx,
                );
                await this.assertWithdrawalHasRoom(
                    tx,
                    targetWithdrawal,
                    dto.amount ?? bill.amount,
                    id,
                );
            }

            return tx.accountBill.update({
                where: { id },
                data: {
                    ...(dto.withdrawalId !== undefined && { withdrawalId: dto.withdrawalId }),
                    ...(dto.amount !== undefined && { amount: dto.amount }),
                    ...(dto.billedOn !== undefined && { billedOn: new Date(dto.billedOn) }),
                    ...(dto.category !== undefined && { category: dto.category }),
                    ...(dto.vendor !== undefined && { vendor: dto.vendor }),
                    ...(dto.billNumber !== undefined && { billNumber: dto.billNumber }),
                    ...(dto.note !== undefined && { note: dto.note }),
                },
                include: ACCOUNT_BILL_INCLUDE,
            });
        });
    }

    public async deleteBill(id: string): Promise<AccountBillBasic> {
        const bill = await this.assertBillExists(id);

        await this.prisma.accountBill.delete({ where: { id } });

        return bill;
    }
}
