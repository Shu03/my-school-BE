import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ExamType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
    IsEnum,
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class CreateExamDto {
    @ApiProperty({ example: "Unit Test 1" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ enum: ExamType, example: ExamType.UNIT_TEST })
    @IsEnum(ExamType)
    public type!: ExamType;

    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    public classId!: string;

    @ApiProperty({ example: "uuid-of-subject" })
    @IsUUID()
    public subjectId!: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ example: "uuid-of-term" })
    @IsUUID()
    @IsOptional()
    public termId?: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    @Max(1000)
    public totalMarks!: number;

    @ApiProperty({ example: "2026-08-04" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public date!: string;
}
