import {
    Body,
    Controller,
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

import { PERMISSION_FEES_MANAGE } from "@common/constants";
import { CurrentUser, Permissions, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import {
    BackfillFeesDto,
    CreateFeeStructureDto,
    ListFeeRecordsDto,
    ListFeeStructuresDto,
    RecordPaymentDto,
    UpdateFeeStructureDto,
} from "./dto";
import { FeesService } from "./fees.service";

@ApiTags("Fees")
@ApiBearerAuth()
@Controller("fees")
export class FeesController {
    public constructor(private readonly feesService: FeesService) {}

    @Post("structures")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_FEES_MANAGE)
    public createFeeStructure(
        @Body() dto: CreateFeeStructureDto,
    ): ReturnType<FeesService["createFeeStructure"]> {
        return this.feesService.createFeeStructure(dto);
    }

    @Get("structures")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_FEES_MANAGE)
    public listFeeStructures(
        @Query() dto: ListFeeStructuresDto,
    ): ReturnType<FeesService["listFeeStructures"]> {
        return this.feesService.listFeeStructures(dto);
    }

    @Patch("structures/:id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_FEES_MANAGE)
    public updateFeeStructure(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateFeeStructureDto,
    ): ReturnType<FeesService["updateFeeStructure"]> {
        return this.feesService.updateFeeStructure(id, dto);
    }

    @Post("backfill")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_FEES_MANAGE)
    @HttpCode(HttpStatus.OK)
    public backfill(@Body() dto: BackfillFeesDto): ReturnType<FeesService["backfill"]> {
        return this.feesService.backfill(dto);
    }

    @Get("records")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findAllRecords(
        @Query() dto: ListFeeRecordsDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<FeesService["findAllRecords"]> {
        return this.feesService.findAllRecords(dto, user);
    }

    @Get("records/:id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findOneRecord(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<FeesService["findOneRecord"]> {
        return this.feesService.findOneRecord(id, user);
    }

    @Post("records/:id/payments")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_FEES_MANAGE)
    public recordPayment(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: RecordPaymentDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<FeesService["recordPayment"]> {
        return this.feesService.recordPayment(id, dto, user);
    }

    @Get("records/:id/payments")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public listPayments(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<FeesService["listPayments"]> {
        return this.feesService.listPayments(id, user);
    }

    @Get("student/:studentId")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public getStudentFeeHistory(
        @Param("studentId", ParseUUIDPipe) studentId: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<FeesService["getStudentFeeHistory"]> {
        return this.feesService.getStudentFeeHistory(studentId, user);
    }
}
