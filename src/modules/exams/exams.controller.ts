import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_GRADES_WRITE } from "@common/constants";
import { CurrentUser, Permissions, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AddExamSubjectDto } from "./dto/add-exam-subject.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { ListExamsDto } from "./dto/list-exams.dto";
import { UpdateExamSubjectDto } from "./dto/update-exam-subject.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { ExamsService } from "./exams.service";

@ApiTags("Exams")
@ApiBearerAuth()
@Controller("exams")
export class ExamsController {
    public constructor(private readonly examsService: ExamsService) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @ApiOperation({ summary: "Create a new exam" })
    @ApiCreatedResponse({ description: "Exam created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or grade level mismatch" })
    @ApiForbiddenResponse({ description: "Not the class teacher of this class" })
    public async create(
        @Body() dto: CreateExamDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["create"]>> {
        return this.examsService.create(dto, user);
    }

    @Get()
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "List exams scoped by role" })
    @ApiOkResponse({ description: "Exams retrieved successfully" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async findAll(
        @Query() dto: ListExamsDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["findAll"]>> {
        return this.examsService.findAll(dto, user);
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "Get a single exam with grade summary" })
    @ApiOkResponse({ description: "Exam retrieved successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiForbiddenResponse({ description: "Not allowed to view this exam" })
    public async findOne(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["findOne"]>> {
        return this.examsService.findOne(id, user);
    }

    @Patch(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @ApiOperation({ summary: "Update a non-finalized exam" })
    @ApiOkResponse({ description: "Exam updated successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiBadRequestResponse({ description: "Validation failed or exam finalized/discarded" })
    @ApiForbiddenResponse({ description: "Not the creator of this exam" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateExamDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["update"]>> {
        return this.examsService.update(id, dto, user);
    }

    @Post(":id/subjects")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @ApiOperation({ summary: "Add a subject to a non-finalized exam" })
    @ApiCreatedResponse({ description: "Subject added successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiBadRequestResponse({ description: "Subject already added or grade level mismatch" })
    @ApiForbiddenResponse({ description: "Not the creator of this exam" })
    public async addSubject(
        @Param("id") id: string,
        @Body() dto: AddExamSubjectDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["addSubject"]>> {
        return this.examsService.addSubject(id, dto, user);
    }

    @Patch(":id/subjects/:subjectId")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @ApiOperation({ summary: "Update an exam subject's marks or date" })
    @ApiOkResponse({ description: "Exam subject updated successfully" })
    @ApiNotFoundResponse({ description: "Exam or subject not found" })
    @ApiBadRequestResponse({ description: "Validation failed or exam finalized/discarded" })
    @ApiForbiddenResponse({ description: "Not the creator of this exam" })
    public async updateSubject(
        @Param("id") id: string,
        @Param("subjectId") subjectId: string,
        @Body() dto: UpdateExamSubjectDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["updateSubject"]>> {
        return this.examsService.updateSubject(id, subjectId, dto, user);
    }

    @Delete(":id/subjects/:subjectId")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @ApiOperation({ summary: "Remove a subject from a non-finalized exam" })
    @ApiOkResponse({ description: "Exam subject removed successfully" })
    @ApiNotFoundResponse({ description: "Exam or subject not found" })
    @ApiBadRequestResponse({ description: "Cannot remove the last subject or exam finalized" })
    @ApiForbiddenResponse({ description: "Not the creator of this exam" })
    public async removeSubject(
        @Param("id") id: string,
        @Param("subjectId") subjectId: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["removeSubject"]>> {
        return this.examsService.removeSubject(id, subjectId, user);
    }

    @Post(":id/finalize")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Finalize an exam" })
    @ApiOkResponse({ description: "Exam finalized successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiBadRequestResponse({ description: "Exam already finalized or discarded" })
    @ApiForbiddenResponse({ description: "Not the creator of this exam" })
    public async finalize(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<ExamsService["finalize"]>> {
        return this.examsService.finalize(id, user);
    }

    @Post(":id/unlock")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Unlock a finalized exam (admin only)" })
    @ApiOkResponse({ description: "Exam unlocked successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiBadRequestResponse({ description: "Exam is discarded" })
    public async unlock(@Param("id") id: string): Promise<ReturnType<ExamsService["unlock"]>> {
        return this.examsService.unlock(id);
    }

    @Post(":id/discard")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Discard an exam (admin only)" })
    @ApiOkResponse({ description: "Exam discarded successfully" })
    @ApiNotFoundResponse({ description: "Exam not found" })
    @ApiBadRequestResponse({ description: "Exam is finalized" })
    public async discard(@Param("id") id: string): Promise<ReturnType<ExamsService["discard"]>> {
        return this.examsService.discard(id);
    }
}
