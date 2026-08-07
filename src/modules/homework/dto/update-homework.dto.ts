import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateHomeworkDto {
    @ApiPropertyOptional({ example: "Chapter 5 exercises" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(200)
    @IsOptional()
    public title?: string;

    @ApiPropertyOptional({ example: "Complete questions 1 to 10 from the workbook" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(2000)
    @IsOptional()
    public description?: string;

    @ApiPropertyOptional({ example: "2026-08-10" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public dueDate?: string;
}
