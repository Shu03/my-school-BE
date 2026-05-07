import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { Prisma, Role } from "@prisma/client";

import { generateTempPassword, hashPassword } from "@common/utils";

import { PrismaService } from "@modules/prisma";

import { CreateAdminDto, CreateStudentDto, CreateTeacherDto } from "./dto/create-user.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
    CreateUserResult,
    UserWithoutPassword,
    UserWithProfiles,
    UserWithStudentProfile,
    UserWithTeacherProfile,
} from "./users.types";

@Injectable()
export class UsersService {
    public constructor(private readonly prisma: PrismaService) {}

    private async assertUserExists(id: string): Promise<void> {
        const existing = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`User not found`);
        }
    }

    //create user without profile, to be used by auth module during registration
    public async createAdmin(
        dto: CreateAdminDto,
        createdById: string,
    ): Promise<CreateUserResult<UserWithoutPassword>> {
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        try {
            const user = await this.prisma.user.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    mobileNumber: dto.mobileNumber,
                    email: dto.email,
                    role: Role.ADMIN,
                    password: hashedPassword,
                    createdById,
                },
                omit: { password: true },
            });

            return { user, tempPassword };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const fields = (error.meta as { target?: string[] })?.target;
                if (fields?.includes("mobileNumber")) {
                    throw new BadRequestException("Mobile number is already registered");
                }
                if (fields?.includes("email")) {
                    throw new BadRequestException("Email is already registered");
                }
            }
            throw error;
        }
    }

    public async createTeacher(
        dto: CreateTeacherDto,
        createdById: string,
    ): Promise<CreateUserResult<UserWithTeacherProfile>> {
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        try {
            const user = await this.prisma.user.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    mobileNumber: dto.mobileNumber,
                    email: dto.email,
                    role: Role.TEACHER,
                    password: hashedPassword,
                    createdById,
                    teacherProfile: {
                        create: {
                            employeeCode: dto.employeeCode,
                            joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
                            permissionOverrides: [],
                        },
                    },
                },
                omit: { password: true },
                include: { teacherProfile: true },
            });

            return { user, tempPassword };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const fields = (error.meta as { target?: string[] })?.target;
                if (fields?.includes("mobileNumber")) {
                    throw new BadRequestException("Mobile number is already registered");
                }
                if (fields?.includes("email")) {
                    throw new BadRequestException("Email is already registered");
                }
                if (fields?.includes("employeeCode")) {
                    throw new BadRequestException("Employee code is already taken");
                }
            }
            throw error;
        }
    }

    public async createStudent(
        dto: CreateStudentDto,
        createdById: string,
    ): Promise<CreateUserResult<UserWithStudentProfile>> {
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        try {
            const user = await this.prisma.user.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    mobileNumber: dto.mobileNumber,
                    email: dto.email,
                    role: Role.STUDENT,
                    password: hashedPassword,
                    createdById,
                    studentProfile: {
                        create: {
                            admissionNumber: dto.admissionNumber,
                            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                        },
                    },
                },
                omit: { password: true },
                include: { studentProfile: true },
            });

            return { user, tempPassword };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const fields = (error.meta as { target?: string[] })?.target;
                if (fields?.includes("mobileNumber")) {
                    throw new BadRequestException("Mobile number is already registered");
                }
                if (fields?.includes("email")) {
                    throw new BadRequestException("Email is already registered");
                }
                if (fields?.includes("admissionNumber")) {
                    throw new BadRequestException("Admission number is already taken");
                }
            }
            throw error;
        }
    }

    public async findAll(dto: ListUsersDto): Promise<{
        data: UserWithoutPassword[];
        total: number;
        page: number;
        limit: number;
    }> {
        const { role, isActive, search, page = 1, limit = 20 } = dto;

        const where: Prisma.UserWhereInput = {
            ...(role !== undefined && { role }),
            ...(isActive !== undefined && { isActive }),
            ...(search !== undefined && {
                OR: [
                    {
                        firstName: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        lastName: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        mobileNumber: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            }),
        };

        const [data, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                omit: { password: true },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async findOne(id: string): Promise<UserWithProfiles> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            omit: { password: true },
            include: {
                teacherProfile: true,
                studentProfile: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User not found`);
        }

        return user;
    }

    public async update(id: string, dto: UpdateUserDto): Promise<UserWithoutPassword> {
        await this.assertUserExists(id);

        return this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                ...(dto.email !== undefined && { email: dto.email }),
            },
            omit: { password: true },
        });
    }

    public async deactivate(id: string): Promise<UserWithoutPassword> {
        await this.assertUserExists(id);

        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            omit: { password: true },
        });
    }

    public async activate(id: string): Promise<UserWithoutPassword> {
        await this.assertUserExists(id);

        return this.prisma.user.update({
            where: { id },
            data: { isActive: true },
            omit: { password: true },
        });
    }
}
