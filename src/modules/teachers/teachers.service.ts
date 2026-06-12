import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "@modules/prisma/prisma.service";

import { AssignPresetDto } from "./dto/assign-preset.dto";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { CreatePresetDto } from "./dto/create-preset.dto";
import { UpdatePermissionsDto } from "./dto/update-permissions.dto";
import { UpdatePresetDto } from "./dto/update-preset.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import {
    AssignmentBasic,
    PresetBasic,
    TeacherProfileBasic,
    TeacherProfileWithAssignments,
} from "./teachers.types";

@Injectable()
export class TeachersService {
    public constructor(private readonly prisma: PrismaService) {}

    private async assertPresetExists(id: string): Promise<PresetBasic> {
        const preset = await this.prisma.permissionPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            throw new NotFoundException("Permission preset not found");
        }

        return preset;
    }

    private async assertTeacherExists(id: string): Promise<TeacherProfileBasic> {
        const teacher = await this.prisma.teacherProfile.findUnique({
            where: { id },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
        });

        if (!teacher) {
            throw new NotFoundException("Teacher not found");
        }

        return teacher;
    }

    private async assertEmployeeCodeNotTaken(
        employeeCode: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prisma.teacherProfile.findUnique({
            where: { employeeCode },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(`Employee code ${employeeCode} is already taken`);
        }
    }

    private async assertAssignmentExists(
        assignmentId: string,
        teacherId: string,
    ): Promise<AssignmentBasic> {
        const assignment = await this.prisma.teacherClassAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                class: true,
                subject: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException("Assignment not found");
        }

        if (assignment.teacherId !== teacherId) {
            throw new ForbiddenException("This assignment does not belong to this teacher");
        }

        return assignment;
    }

    /** Preset Services */
    public async createPreset(dto: CreatePresetDto): Promise<PresetBasic> {
        const existing = await this.prisma.permissionPreset.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new BadRequestException(`Permission preset "${dto.name}" already exists`);
        }

        return this.prisma.permissionPreset.create({
            data: {
                name: dto.name,
                permissions: dto.permissions,
            },
        });
    }

    public async findAllPresets(): Promise<PresetBasic[]> {
        return this.prisma.permissionPreset.findMany({
            orderBy: { name: "asc" },
        });
    }

    public async findOnePreset(id: string): Promise<PresetBasic> {
        const preset = await this.prisma.permissionPreset.findUnique({
            where: { id },
        });

        if (!preset) {
            throw new NotFoundException("Permission preset not found");
        }

        return preset;
    }

    public async updatePreset(id: string, dto: UpdatePresetDto): Promise<PresetBasic> {
        if (dto.name === undefined && dto.permissions === undefined) {
            throw new BadRequestException("At least one field must be provided: name, permissions");
        }

        await this.assertPresetExists(id);

        if (dto.name !== undefined) {
            const existing = await this.prisma.permissionPreset.findUnique({
                where: { name: dto.name },
            });

            if (existing && existing.id !== id) {
                throw new BadRequestException(`Permission preset "${dto.name}" already exists`);
            }
        }

        return this.prisma.permissionPreset.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.permissions !== undefined && {
                    permissions: dto.permissions,
                }),
            },
        });
    }

    public async deletePreset(id: string): Promise<void> {
        await this.assertPresetExists(id);

        const teacherCount = await this.prisma.teacherProfile.count({
            where: { presetId: id },
        });

        if (teacherCount > 0) {
            throw new BadRequestException(
                `Cannot delete preset — it is assigned to ${teacherCount} teacher(s). Remove all assignments first.`,
            );
        }

        await this.prisma.permissionPreset.delete({
            where: { id },
        });
    }

    public async findAllTeachers(): Promise<TeacherProfileBasic[]> {
        return this.prisma.teacherProfile.findMany({
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
            orderBy: {
                user: {
                    firstName: "asc",
                },
            },
        });
    }

    public async findOneTeacher(
        id: string,
        requestingUserId: string,
        requestingUserRole: string,
    ): Promise<TeacherProfileWithAssignments> {
        const teacher = await this.prisma.teacherProfile.findUnique({
            where: { id },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
                classAssignments: {
                    include: {
                        class: true,
                        subject: true,
                    },
                },
            },
        });

        if (!teacher) {
            throw new NotFoundException("Teacher not found");
        }

        // Teachers can only view their own profile
        if (requestingUserRole === "TEACHER" && teacher.userId !== requestingUserId) {
            throw new ForbiddenException("You can only view your own profile");
        }

        return teacher;
    }

    public async updateTeacher(id: string, dto: UpdateTeacherDto): Promise<TeacherProfileBasic> {
        if (dto.employeeCode === undefined && dto.joiningDate === undefined) {
            throw new BadRequestException(
                "At least one field must be provided: employeeCode, joiningDate",
            );
        }

        await this.assertTeacherExists(id);

        if (dto.employeeCode !== undefined) {
            await this.assertEmployeeCodeNotTaken(dto.employeeCode, id);
        }

        return this.prisma.teacherProfile.update({
            where: { id },
            data: {
                ...(dto.employeeCode !== undefined && {
                    employeeCode: dto.employeeCode,
                }),
                ...(dto.joiningDate !== undefined && {
                    joiningDate: new Date(dto.joiningDate),
                }),
            },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
        });
    }

    public async assignPreset(id: string, dto: AssignPresetDto): Promise<TeacherProfileBasic> {
        await this.assertTeacherExists(id);
        await this.assertPresetExists(dto.presetId);

        return this.prisma.teacherProfile.update({
            where: { id },
            data: { presetId: dto.presetId },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
        });
    }

    public async removePreset(id: string): Promise<TeacherProfileBasic> {
        const teacher = await this.assertTeacherExists(id);

        if (!teacher.presetId) {
            throw new BadRequestException("This teacher has no preset assigned");
        }

        return this.prisma.teacherProfile.update({
            where: { id },
            data: { presetId: null },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
        });
    }

    public async updatePermissions(
        id: string,
        dto: UpdatePermissionsDto,
    ): Promise<TeacherProfileBasic> {
        await this.assertTeacherExists(id);

        return this.prisma.teacherProfile.update({
            where: { id },
            data: { permissionOverrides: dto.permissionOverrides },
            include: {
                user: {
                    omit: { password: true },
                },
                preset: true,
            },
        });
    }

    public async createAssignment(
        teacherId: string,
        dto: CreateAssignmentDto,
    ): Promise<AssignmentBasic> {
        await this.assertTeacherExists(teacherId);

        // Validate subjectId required for SUBJECT_TEACHER
        if (dto.role === "SUBJECT_TEACHER" && !dto.subjectId) {
            throw new BadRequestException("subjectId is required for SUBJECT_TEACHER role");
        }

        // Validate subjectId not provided for CLASS_TEACHER
        if (dto.role === "CLASS_TEACHER" && dto.subjectId) {
            throw new BadRequestException("subjectId must not be provided for CLASS_TEACHER role");
        }

        // Validate class exists
        const classRecord = await this.prisma.class.findUnique({
            where: { id: dto.classId },
        });

        if (!classRecord) {
            throw new NotFoundException("Class not found");
        }

        // Validate subject exists and grade level matches
        if (dto.subjectId) {
            const subject = await this.prisma.subject.findUnique({
                where: { id: dto.subjectId },
            });

            if (!subject) {
                throw new NotFoundException("Subject not found");
            }

            if (subject.gradeLevel !== classRecord.gradeLevel) {
                throw new BadRequestException(
                    `Subject grade level (${subject.gradeLevel}) does not match class grade level (${classRecord.gradeLevel})`,
                );
            }
        }

        // Validate no duplicate CLASS_TEACHER assignment for this class
        if (dto.role === "CLASS_TEACHER") {
            const existingClassTeacher = await this.prisma.teacherClassAssignment.findFirst({
                where: {
                    classId: dto.classId,
                    role: "CLASS_TEACHER",
                },
            });

            if (existingClassTeacher) {
                throw new BadRequestException("This class already has a class teacher assigned");
            }
        }

        return this.prisma.teacherClassAssignment.create({
            data: {
                teacherId,
                classId: dto.classId,
                subjectId: dto.subjectId ?? null,
                role: dto.role,
            },
            include: {
                class: true,
                subject: true,
            },
        });
    }

    public async findAssignments(
        teacherId: string,
        requestingUserId: string,
        requestingUserRole: string,
    ): Promise<AssignmentBasic[]> {
        const teacher = await this.assertTeacherExists(teacherId);

        if (requestingUserRole === "TEACHER" && teacher.user.id !== requestingUserId) {
            throw new ForbiddenException("You can only view your own assignments");
        }

        return this.prisma.teacherClassAssignment.findMany({
            where: { teacherId },
            include: {
                class: true,
                subject: true,
            },
            orderBy: [{ class: { gradeLevel: "asc" } }, { class: { name: "asc" } }],
        });
    }

    public async deleteAssignment(teacherId: string, assignmentId: string): Promise<void> {
        await this.assertTeacherExists(teacherId);
        await this.assertAssignmentExists(assignmentId, teacherId);

        await this.prisma.teacherClassAssignment.delete({
            where: { id: assignmentId },
        });
    }
}
