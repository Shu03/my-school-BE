import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsInt, IsISO8601, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class CreateFeeStructureDto {
    @ApiProperty({ example: 5 })
    @IsInt()
    @Min(1)
    public classLevel!: number;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiProperty({ example: 15000 })
    @IsNumber()
    @Min(1)
    public totalAmount!: number;

    @ApiProperty({ example: "2026-06-30" })
    @IsISO8601({ strict: true })
    public dueDate!: string;
}
