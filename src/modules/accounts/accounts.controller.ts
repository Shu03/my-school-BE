import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AccountsService } from "./accounts.service";
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

@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("accounts")
export class AccountsController {
    public constructor(private readonly accountsService: AccountsService) {}

    // ─── Summary ─────────────────────────────────────────────────────────────────

    @Get("summary")
    @Roles(Role.ADMIN)
    public getSummary(): ReturnType<AccountsService["getSummary"]> {
        return this.accountsService.getSummary();
    }

    // ─── Deposits ────────────────────────────────────────────────────────────────

    @Post("deposits")
    @Roles(Role.ADMIN)
    public createDeposit(
        @Body() dto: CreateDepositDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AccountsService["createDeposit"]> {
        return this.accountsService.createDeposit(dto, user);
    }

    @Get("deposits")
    @Roles(Role.ADMIN)
    public findAllDeposits(
        @Query() dto: ListAccountEntriesDto,
    ): ReturnType<AccountsService["findAllDeposits"]> {
        return this.accountsService.findAllDeposits(dto);
    }

    @Get("deposits/:id")
    @Roles(Role.ADMIN)
    public findOneDeposit(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["findOneDeposit"]> {
        return this.accountsService.findOneDeposit(id);
    }

    @Patch("deposits/:id")
    @Roles(Role.ADMIN)
    public updateDeposit(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateDepositDto,
    ): ReturnType<AccountsService["updateDeposit"]> {
        return this.accountsService.updateDeposit(id, dto);
    }

    @Delete("deposits/:id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    public deleteDeposit(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["deleteDeposit"]> {
        return this.accountsService.deleteDeposit(id);
    }

    // ─── Withdrawals ─────────────────────────────────────────────────────────────

    @Post("withdrawals")
    @Roles(Role.ADMIN)
    public createWithdrawal(
        @Body() dto: CreateWithdrawalDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AccountsService["createWithdrawal"]> {
        return this.accountsService.createWithdrawal(dto, user);
    }

    @Get("withdrawals")
    @Roles(Role.ADMIN)
    public findAllWithdrawals(
        @Query() dto: ListAccountEntriesDto,
    ): ReturnType<AccountsService["findAllWithdrawals"]> {
        return this.accountsService.findAllWithdrawals(dto);
    }

    @Get("withdrawals/:id")
    @Roles(Role.ADMIN)
    public findOneWithdrawal(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["findOneWithdrawal"]> {
        return this.accountsService.findOneWithdrawal(id);
    }

    @Patch("withdrawals/:id")
    @Roles(Role.ADMIN)
    public updateWithdrawal(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateWithdrawalDto,
    ): ReturnType<AccountsService["updateWithdrawal"]> {
        return this.accountsService.updateWithdrawal(id, dto);
    }

    @Delete("withdrawals/:id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    public deleteWithdrawal(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["deleteWithdrawal"]> {
        return this.accountsService.deleteWithdrawal(id);
    }

    // ─── Bills ───────────────────────────────────────────────────────────────────

    @Post("bills")
    @Roles(Role.ADMIN)
    public createBill(
        @Body() dto: CreateBillDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AccountsService["createBill"]> {
        return this.accountsService.createBill(dto, user);
    }

    @Get("bills")
    @Roles(Role.ADMIN)
    public findAllBills(@Query() dto: ListBillsDto): ReturnType<AccountsService["findAllBills"]> {
        return this.accountsService.findAllBills(dto);
    }

    @Get("bills/:id")
    @Roles(Role.ADMIN)
    public findOneBill(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["findOneBill"]> {
        return this.accountsService.findOneBill(id);
    }

    @Patch("bills/:id")
    @Roles(Role.ADMIN)
    public updateBill(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateBillDto,
    ): ReturnType<AccountsService["updateBill"]> {
        return this.accountsService.updateBill(id, dto);
    }

    @Delete("bills/:id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    public deleteBill(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AccountsService["deleteBill"]> {
        return this.accountsService.deleteBill(id);
    }
}
