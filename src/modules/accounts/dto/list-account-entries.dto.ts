import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsInt, IsOptional, Max, Min } from "class-validator";

import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@common/constants";

export class ListAccountEntriesDto {
    @ApiPropertyOptional({ example: "2026-06-01" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public startDate?: string;

    @ApiPropertyOptional({ example: "2026-06-30" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public endDate?: string;

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
