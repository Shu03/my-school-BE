import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAcademicYearDto {
    @ApiProperty({ example: "2024-25" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    public name!: string;

    @ApiProperty({ example: "2024-04-01" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public startDate!: string;

    @ApiProperty({ example: "2025-03-31" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public endDate!: string;

    @ApiPropertyOptional({ example: false })
    @IsBoolean()
    @IsOptional()
    public copyClassStructureFromCurrent?: boolean;
}
