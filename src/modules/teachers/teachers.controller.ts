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

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AssignPresetDto } from "./dto/assign-preset.dto";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { CreatePresetDto } from "./dto/create-preset.dto";
import { UpdatePermissionsDto } from "./dto/update-permissions.dto";
import { UpdatePresetDto } from "./dto/update-preset.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { TeachersService } from "./teachers.service";

@ApiTags("Teachers")
@ApiBearerAuth()
@Controller("teachers")
export class TeachersController {
    public constructor(private readonly teachersService: TeachersService) {}

    // ─── Permission Presets ───────────────────────────────────────────

    @Post("presets")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Create a permission preset" })
    @ApiCreatedResponse({ description: "Preset created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or name taken" })
    public async createPreset(
        @Body() dto: CreatePresetDto,
    ): Promise<ReturnType<TeachersService["createPreset"]>> {
        return this.teachersService.createPreset(dto);
    }

    @Get("presets")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "List all permission presets" })
    @ApiOkResponse({ description: "Presets retrieved successfully" })
    public async findAllPresets(): Promise<ReturnType<TeachersService["findAllPresets"]>> {
        return this.teachersService.findAllPresets();
    }

    @Get("presets/:presetId")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Get a single permission preset" })
    @ApiOkResponse({ description: "Preset retrieved successfully" })
    @ApiNotFoundResponse({ description: "Preset not found" })
    public async findOnePreset(
        @Param("presetId") presetId: string,
    ): Promise<ReturnType<TeachersService["findOnePreset"]>> {
        return this.teachersService.findOnePreset(presetId);
    }

    @Patch("presets/:presetId")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Update a permission preset" })
    @ApiOkResponse({ description: "Preset updated successfully" })
    @ApiNotFoundResponse({ description: "Preset not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async updatePreset(
        @Param("presetId") presetId: string,
        @Body() dto: UpdatePresetDto,
    ): Promise<ReturnType<TeachersService["updatePreset"]>> {
        return this.teachersService.updatePreset(presetId, dto);
    }

    @Delete("presets/:presetId")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Delete a permission preset" })
    @ApiOkResponse({ description: "Preset deleted successfully" })
    @ApiNotFoundResponse({ description: "Preset not found" })
    @ApiBadRequestResponse({ description: "Preset has assigned teachers" })
    public async deletePreset(@Param("presetId") presetId: string): Promise<void> {
        await this.teachersService.deletePreset(presetId);
    }

    // ─── Teacher Profiles ─────────────────────────────────────────────

    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "List all teachers" })
    @ApiOkResponse({ description: "Teachers retrieved successfully" })
    public async findAllTeachers(): Promise<ReturnType<TeachersService["findAllTeachers"]>> {
        return this.teachersService.findAllTeachers();
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Get a single teacher profile" })
    @ApiOkResponse({ description: "Teacher retrieved successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiForbiddenResponse({ description: "Cannot view another teacher profile" })
    public async findOneTeacher(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<TeachersService["findOneTeacher"]>> {
        return this.teachersService.findOneTeacher(id, user.sub, user.role);
    }

    @Patch(":id")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Update teacher profile" })
    @ApiOkResponse({ description: "Teacher updated successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async updateTeacher(
        @Param("id") id: string,
        @Body() dto: UpdateTeacherDto,
    ): Promise<ReturnType<TeachersService["updateTeacher"]>> {
        return this.teachersService.updateTeacher(id, dto);
    }

    @Patch(":id/assign-preset")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Assign a permission preset to a teacher" })
    @ApiOkResponse({ description: "Preset assigned successfully" })
    @ApiNotFoundResponse({ description: "Teacher or preset not found" })
    public async assignPreset(
        @Param("id") id: string,
        @Body() dto: AssignPresetDto,
    ): Promise<ReturnType<TeachersService["assignPreset"]>> {
        return this.teachersService.assignPreset(id, dto);
    }

    @Patch(":id/remove-preset")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Remove preset from teacher" })
    @ApiOkResponse({ description: "Preset removed successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiBadRequestResponse({ description: "No preset assigned" })
    public async removePreset(
        @Param("id") id: string,
    ): Promise<ReturnType<TeachersService["removePreset"]>> {
        return this.teachersService.removePreset(id);
    }

    @Patch(":id/permissions")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Update teacher permission overrides" })
    @ApiOkResponse({ description: "Permissions updated successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    public async updatePermissions(
        @Param("id") id: string,
        @Body() dto: UpdatePermissionsDto,
    ): Promise<ReturnType<TeachersService["updatePermissions"]>> {
        return this.teachersService.updatePermissions(id, dto);
    }

    // ─── Teacher Class Assignments ────────────────────────────────────

    @Post(":id/assignments")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Assign teacher to a class" })
    @ApiCreatedResponse({ description: "Assignment created successfully" })
    @ApiNotFoundResponse({ description: "Teacher, class or subject not found" })
    @ApiBadRequestResponse({ description: "Validation failed or grade mismatch" })
    public async createAssignment(
        @Param("id") id: string,
        @Body() dto: CreateAssignmentDto,
    ): Promise<ReturnType<TeachersService["createAssignment"]>> {
        return this.teachersService.createAssignment(id, dto);
    }

    @Get(":id/assignments")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "List all assignments for a teacher" })
    @ApiOkResponse({ description: "Assignments retrieved successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiForbiddenResponse({ description: "Cannot view another teacher assignments" })
    public async findAssignments(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<TeachersService["findAssignments"]>> {
        return this.teachersService.findAssignments(id, user.sub, user.role);
    }

    @Delete(":id/assignments/:assignmentId")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Remove a teacher class assignment" })
    @ApiOkResponse({ description: "Assignment removed successfully" })
    @ApiNotFoundResponse({ description: "Teacher or assignment not found" })
    public async deleteAssignment(
        @Param("id") id: string,
        @Param("assignmentId") assignmentId: string,
    ): Promise<void> {
        await this.teachersService.deleteAssignment(id, assignmentId);
    }
}
