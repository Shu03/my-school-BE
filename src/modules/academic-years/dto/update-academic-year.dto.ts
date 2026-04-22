import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAcademicYearDto {
    @ApiPropertyOptional({ example: "2024-25" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @IsOptional()
    public name?: string;

    @ApiPropertyOptional({ example: "2024-04-01" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public startDate?: string;

    @ApiPropertyOptional({ example: "2025-03-31" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public endDate?: string;
}
