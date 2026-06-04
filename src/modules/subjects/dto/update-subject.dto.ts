import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateSubjectDto {
    @ApiPropertyOptional({ example: "Mathematics" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsOptional()
    public name?: string;

    @ApiPropertyOptional({ example: "MATH" })
    @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    @IsOptional()
    public code?: string;

    @ApiPropertyOptional({ example: "Updated description" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsOptional()
    @MaxLength(500)
    public description?: string;
}
