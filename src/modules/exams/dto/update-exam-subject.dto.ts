import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsISO8601, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdateExamSubjectDto {
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
}
