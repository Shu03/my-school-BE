import { ApiPropertyOptional } from "@nestjs/swagger";

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

export class UpdateExamDto {
    @ApiPropertyOptional({ example: "Unit Test 1" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsOptional()
    public name?: string;

    @ApiPropertyOptional({ enum: ExamType, example: ExamType.UNIT_TEST })
    @IsEnum(ExamType)
    @IsOptional()
    public type?: ExamType;

    @ApiPropertyOptional({ example: 100 })
    @IsNumber()
    @Min(1)
    @Max(1000)
    @IsOptional()
    public totalMarks?: number;

    @ApiPropertyOptional({ example: "2026-08-04" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public date?: string;

    @ApiPropertyOptional({ example: "uuid-of-term" })
    @IsUUID()
    @IsOptional()
    public termId?: string;
}
