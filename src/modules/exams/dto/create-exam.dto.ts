import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ExamType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateNested,
} from "class-validator";

import { ExamSubjectInputDto } from "./exam-subject-input.dto";

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
    public sectionId!: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ example: "uuid-of-term" })
    @IsUUID()
    @IsOptional()
    public termId?: string;

    @ApiProperty({ type: [ExamSubjectInputDto] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ExamSubjectInputDto)
    public subjects!: ExamSubjectInputDto[];
}
