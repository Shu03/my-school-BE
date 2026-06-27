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
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { Roles } from "@common/decorators";

import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { ListHolidaysDto } from "./dto/list-holidays.dto";
import { UpdateSchoolSettingsDto } from "./dto/update-school-settings.dto";
import { SchoolService } from "./school.service";

@ApiTags("School")
@ApiBearerAuth()
@Controller("school")
export class SchoolController {
    public constructor(private readonly schoolService: SchoolService) {}

    @Get("settings")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Get school settings" })
    @ApiOkResponse({ description: "School settings retrieved successfully" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async getSettings(): Promise<ReturnType<SchoolService["getSettings"]>> {
        return this.schoolService.getSettings();
    }

    @Patch("settings")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Update weekly off-days" })
    @ApiOkResponse({ description: "School settings updated successfully" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async updateSettings(
        @Body() dto: UpdateSchoolSettingsDto,
    ): Promise<ReturnType<SchoolService["updateSettings"]>> {
        return this.schoolService.updateSettings(dto);
    }

    @Post("holidays")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Add a holiday" })
    @ApiCreatedResponse({ description: "Holiday created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    @ApiConflictResponse({ description: "Holiday already exists on this date" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async createHoliday(
        @Body() dto: CreateHolidayDto,
    ): Promise<ReturnType<SchoolService["createHoliday"]>> {
        return this.schoolService.createHoliday(dto);
    }

    @Get("holidays")
    @ApiOperation({ summary: "List holidays for an academic year" })
    @ApiOkResponse({ description: "Holidays retrieved successfully" })
    public async listHolidays(
        @Query() dto: ListHolidaysDto,
    ): Promise<ReturnType<SchoolService["listHolidays"]>> {
        return this.schoolService.listHolidays(dto);
    }

    @Delete("holidays/:id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Remove a holiday" })
    @ApiOkResponse({ description: "Holiday deleted successfully" })
    @ApiNotFoundResponse({ description: "Holiday not found" })
    @ApiForbiddenResponse({ description: "Insufficient permissions" })
    public async deleteHoliday(@Param("id") id: string): Promise<void> {
        await this.schoolService.deleteHoliday(id);
    }
}
