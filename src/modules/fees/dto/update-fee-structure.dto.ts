import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsISO8601, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateFeeStructureDto {
    @ApiPropertyOptional({ example: 16000 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    public totalAmount?: number;

    @ApiPropertyOptional({ example: "2026-07-15" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public dueDate?: string;
}
