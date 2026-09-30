import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import {
    AssignmentBasic,
    TeacherProfileBasic,
    TeacherProfileWithAssignments,
} from "./teachers.types";

@Injectable()
export class TeachersService {
    public constructor(private readonly prisma: PrismaService) {}

    private async assertTeacherExists(id: string): Promise<TeacherProfileBasic> {
        const teacher = await this.prisma.teacherProfile.findUnique({
            where: { id },
            include: {
                user: {
                    omit: { password: true },
                },
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
                section: true,
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

    public async findAllTeachers(): Promise<TeacherProfileBasic[]> {
        return this.prisma.teacherProfile.findMany({
            include: {
                user: {
                    omit: { password: true },
                },
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
                classAssignments: {
                    include: {
                        section: true,
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

        // Validate section exists
        const classRecord = await this.prisma.section.findUnique({
            where: { id: dto.sectionId },
        });

        if (!classRecord) {
            throw new NotFoundException("Section not found");
        }

        // Validate subject exists and grade level matches
        if (dto.subjectId) {
            const subject = await this.prisma.subject.findUnique({
                where: { id: dto.subjectId },
            });

            if (!subject) {
                throw new NotFoundException("Subject not found");
            }

            if (subject.classLevel !== classRecord.classLevel) {
                throw new BadRequestException(
                    `Subject class level (${subject.classLevel}) does not match section class level (${classRecord.classLevel})`,
                );
            }
        }

        // Validate no duplicate CLASS_TEACHER assignment for this section
        if (dto.role === "CLASS_TEACHER") {
            const existingClassTeacher = await this.prisma.teacherClassAssignment.findFirst({
                where: {
                    sectionId: dto.sectionId,
                    role: "CLASS_TEACHER",
                },
            });

            if (existingClassTeacher) {
                throw new BadRequestException("This section already has a class teacher assigned");
            }
        }

        return this.prisma.teacherClassAssignment.create({
            data: {
                teacherId,
                sectionId: dto.sectionId,
                subjectId: dto.subjectId ?? null,
                role: dto.role,
            },
            include: {
                section: true,
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
                section: true,
                subject: true,
            },
            orderBy: [{ section: { classLevel: "asc" } }, { section: { name: "asc" } }],
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
