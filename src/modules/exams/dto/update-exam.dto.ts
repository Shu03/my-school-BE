import { ApiPropertyOptional } from "@nestjs/swagger";

import { ExamType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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

    @ApiPropertyOptional({ example: "uuid-of-term" })
    @IsUUID()
    @IsOptional()
    public termId?: string;
}
