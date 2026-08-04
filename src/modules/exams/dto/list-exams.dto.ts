import { ApiPropertyOptional } from "@nestjs/swagger";

import { ExamStatus, ExamType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@common/constants";

export class ListExamsDto {
    @ApiPropertyOptional({ example: "uuid-of-class" })
    @IsUUID()
    @IsOptional()
    public classId?: string;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ enum: ExamType, example: ExamType.UNIT_TEST })
    @IsEnum(ExamType)
    @IsOptional()
    public type?: ExamType;

    @ApiPropertyOptional({ enum: ExamStatus, example: ExamStatus.ACTIVE })
    @IsEnum(ExamStatus)
    @IsOptional()
    public status?: ExamStatus;

    @ApiPropertyOptional({ example: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public page?: number = DEFAULT_PAGE;

    @ApiPropertyOptional({ example: 20 })
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_LIMIT)
    @IsOptional()
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public limit?: number = DEFAULT_PAGE_LIMIT;
}
