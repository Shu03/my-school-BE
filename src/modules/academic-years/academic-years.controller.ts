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
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNotFoundResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_ACADEMIC_YEAR_MANAGE } from "@common/constants";
import { Permissions, Roles } from "@common/decorators";

import { AcademicYearsService } from "./academic-years.service";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { UpdateTermDto } from "./dto/update-term.dto";

@ApiTags("Academic Years")
@ApiBearerAuth()
@Controller("academic-years")
export class AcademicYearsController {
    public constructor(private readonly academicYearsService: AcademicYearsService) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "Create a new academic year" })
    @ApiCreatedResponse({ description: "Academic year created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or name taken" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async create(
        @Body() dto: CreateAcademicYearDto,
    ): Promise<ReturnType<AcademicYearsService["create"]>> {
        return this.academicYearsService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "List all academic years" })
    @ApiOkResponse({ description: "Academic years retrieved successfully" })
    public async findAll(): Promise<ReturnType<AcademicYearsService["findAll"]>> {
        return this.academicYearsService.findAll();
    }

    @Get("current")
    @ApiOperation({ summary: "Get current academic year with terms" })
    @ApiOkResponse({ description: "Current academic year retrieved" })
    @ApiNotFoundResponse({ description: "No current academic year set" })
    public async findCurrent(): Promise<ReturnType<AcademicYearsService["findCurrent"]>> {
        return this.academicYearsService.findCurrent();
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "Get a single academic year with terms" })
    @ApiOkResponse({ description: "Academic year retrieved successfully" })
    @ApiNotFoundResponse({ description: "Academic year not found" })
    public async findOne(
        @Param("id") id: string,
    ): Promise<ReturnType<AcademicYearsService["findOne"]>> {
        return this.academicYearsService.findOne(id);
    }

    @Patch(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "Update academic year" })
    @ApiOkResponse({ description: "Academic year updated successfully" })
    @ApiNotFoundResponse({ description: "Academic year not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateAcademicYearDto,
    ): Promise<ReturnType<AcademicYearsService["update"]>> {
        return this.academicYearsService.update(id, dto);
    }

    @Patch(":id/set-current")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Set academic year as current" })
    @ApiOkResponse({ description: "Academic year set as current" })
    @ApiNotFoundResponse({ description: "Academic year not found" })
    @ApiBadRequestResponse({ description: "Already set as current" })
    public async setCurrent(
        @Param("id") id: string,
    ): Promise<ReturnType<AcademicYearsService["setCurrent"]>> {
        return this.academicYearsService.setCurrent(id);
    }

    @Post(":id/terms")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "Create a term within an academic year" })
    @ApiCreatedResponse({ description: "Term created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or dates out of bounds" })
    @ApiNotFoundResponse({ description: "Academic year not found" })
    public async createTerm(
        @Param("id") id: string,
        @Body() dto: CreateTermDto,
    ): Promise<ReturnType<AcademicYearsService["createTerm"]>> {
        return this.academicYearsService.createTerm(id, dto);
    }

    @Get(":id/terms")
    @ApiOperation({ summary: "List terms for an academic year" })
    @ApiOkResponse({ description: "Terms retrieved successfully" })
    @ApiNotFoundResponse({ description: "Academic year not found" })
    public async findTerms(
        @Param("id") id: string,
    ): Promise<ReturnType<AcademicYearsService["findTerms"]>> {
        return this.academicYearsService.findTerms(id);
    }

    @Patch(":id/terms/:termId")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ACADEMIC_YEAR_MANAGE)
    @ApiOperation({ summary: "Update a term" })
    @ApiOkResponse({ description: "Term updated successfully" })
    @ApiNotFoundResponse({ description: "Term not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async updateTerm(
        @Param("id") id: string,
        @Param("termId") termId: string,
        @Body() dto: UpdateTermDto,
    ): Promise<ReturnType<AcademicYearsService["updateTerm"]>> {
        return this.academicYearsService.updateTerm(id, termId, dto);
    }

    @Delete(":id/terms/:termId")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Delete a term" })
    @ApiOkResponse({ description: "Term deleted successfully" })
    @ApiNotFoundResponse({ description: "Term not found" })
    public async deleteTerm(
        @Param("id") id: string,
        @Param("termId") termId: string,
    ): Promise<void> {
        await this.academicYearsService.deleteTerm(id, termId);
    }
}
