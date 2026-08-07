import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@common/constants";

export class ListAnnouncementsDto {
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
