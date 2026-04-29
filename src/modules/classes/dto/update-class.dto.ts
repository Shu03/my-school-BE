import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateClassDto {
    @ApiPropertyOptional({ example: "6B" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @IsOptional()
    public name?: string;

    @ApiPropertyOptional({ example: 6 })
    @IsInt()
    @Min(1)
    @IsOptional()
    public gradeLevel?: number;
}
