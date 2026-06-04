import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ListSubjectsDto {
    @ApiPropertyOptional({ example: 6 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public gradeLevel?: number;

    @ApiPropertyOptional({ example: "Math" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsOptional()
    @MaxLength(100)
    public search?: string;
}
