import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNotFoundResponse,
    ApiBadRequestResponse,
    ApiBody,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { CreateAdminDto, CreateStudentDto, CreateTeacherDto } from "./dto/create-user.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller("users")
export class UsersController {
    public constructor(private readonly usersService: UsersService) {}

    @Post("admin")
    @ApiOperation({ summary: "Create an Admin account" })
    @ApiCreatedResponse({ description: "Admin created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or mobile number taken" })
    @ApiBody({ type: CreateAdminDto })
    public async createAdmin(
        @Body() dto: CreateAdminDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<UsersService["createAdmin"]>> {
        return this.usersService.createAdmin(dto, user.sub);
    }

    @Post("teacher")
    @ApiOperation({ summary: "Create a Teacher account" })
    @ApiCreatedResponse({ description: "Teacher created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or duplicate data" })
    @ApiBody({ type: CreateTeacherDto })
    public async createTeacher(
        @Body() dto: CreateTeacherDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<UsersService["createTeacher"]>> {
        return this.usersService.createTeacher(dto, user.sub);
    }

    @Post("student")
    @ApiOperation({ summary: "Create a Student account" })
    @ApiCreatedResponse({ description: "Student created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or duplicate data" })
    @ApiBody({ type: CreateStudentDto })
    public async createStudent(
        @Body() dto: CreateStudentDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<UsersService["createStudent"]>> {
        return this.usersService.createStudent(dto, user.sub);
    }

    @Get()
    @ApiOperation({ summary: "List all users with filters and pagination" })
    @ApiOkResponse({ description: "Users retrieved successfully" })
    public async findAll(@Query() dto: ListUsersDto): Promise<ReturnType<UsersService["findAll"]>> {
        return this.usersService.findAll(dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single user by ID" })
    @ApiOkResponse({ description: "User retrieved successfully" })
    @ApiNotFoundResponse({ description: "User not found" })
    public async findOne(@Param("id") id: string): Promise<ReturnType<UsersService["findOne"]>> {
        return this.usersService.findOne(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update user name or email" })
    @ApiOkResponse({ description: "User updated successfully" })
    @ApiNotFoundResponse({ description: "User not found" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<ReturnType<UsersService["update"]>> {
        return this.usersService.update(id, dto);
    }

    @Patch(":id/deactivate")
    @ApiOperation({ summary: "Deactivate a user account" })
    @ApiOkResponse({ description: "User deactivated successfully" })
    @ApiNotFoundResponse({ description: "User not found" })
    public async deactivate(
        @Param("id") id: string,
    ): Promise<ReturnType<UsersService["deactivate"]>> {
        return this.usersService.deactivate(id);
    }

    @Patch(":id/activate")
    @ApiOperation({ summary: "Activate a user account" })
    @ApiOkResponse({ description: "User activated successfully" })
    @ApiNotFoundResponse({ description: "User not found" })
    public async activate(@Param("id") id: string): Promise<ReturnType<UsersService["activate"]>> {
        return this.usersService.activate(id);
    }
}
