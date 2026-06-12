import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateTeacherDto {
    @ApiPropertyOptional({ example: "TCH002" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @IsOptional()
    public employeeCode?: string;

    @ApiPropertyOptional({ example: "2024-01-15" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public joiningDate?: string;
}
