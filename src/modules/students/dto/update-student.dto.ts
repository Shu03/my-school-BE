import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateStudentDto {
    @ApiPropertyOptional({ example: "2010-05-15" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public dateOfBirth?: string;

    @ApiPropertyOptional({ example: "ADM-2026-001" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @IsOptional()
    public admissionNumber?: string;
}
