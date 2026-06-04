import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateSubjectDto {
    @ApiProperty({ example: "Mathematics" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ example: "MATH" })
    @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    public code!: string;

    @ApiProperty({ example: 6 })
    @IsInt()
    @Min(1)
    public gradeLevel!: number;

    @ApiPropertyOptional({ example: "Core mathematics for grade 6" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsOptional()
    @MaxLength(500)
    public description?: string;
}
