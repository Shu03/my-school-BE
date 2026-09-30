import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { Roles } from "@common/decorators";

import { CreateSectionDto } from "./dto/create-section.dto";
import { ListSectionsDto } from "./dto/list-sections.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { SectionsService } from "./sections.service";

@ApiTags("Sections")
@ApiBearerAuth()
@Controller("sections")
export class SectionsController {
    public constructor(private readonly sectionsService: SectionsService) {}

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Create a new class" })
    @ApiCreatedResponse({ description: "Class created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or name taken" })
    public async create(
        @Body() dto: CreateSectionDto,
    ): Promise<ReturnType<SectionsService["create"]>> {
        return this.sectionsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: "List classes by academic year" })
    @ApiOkResponse({ description: "Classes retrieved successfully" })
    public async findAll(
        @Query() dto: ListSectionsDto,
    ): Promise<ReturnType<SectionsService["findAll"]>> {
        return this.sectionsService.findAll(dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single class with relations" })
    @ApiOkResponse({ description: "Class retrieved successfully" })
    @ApiNotFoundResponse({ description: "Class not found" })
    public async findOne(@Param("id") id: string): Promise<ReturnType<SectionsService["findOne"]>> {
        return this.sectionsService.findOne(id);
    }

    @Patch(":id")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Update class name or grade level" })
    @ApiOkResponse({ description: "Class updated successfully" })
    @ApiNotFoundResponse({ description: "Class not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateSectionDto,
    ): Promise<ReturnType<SectionsService["update"]>> {
        return this.sectionsService.update(id, dto);
    }
}
