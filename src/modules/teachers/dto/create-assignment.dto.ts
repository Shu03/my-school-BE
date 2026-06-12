import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { TeacherClassRole } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class CreateAssignmentDto {
    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    @IsNotEmpty()
    public classId!: string;

    @ApiProperty({ enum: TeacherClassRole, example: TeacherClassRole.SUBJECT_TEACHER })
    @IsEnum(TeacherClassRole)
    @IsNotEmpty()
    public role!: TeacherClassRole;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;
}
