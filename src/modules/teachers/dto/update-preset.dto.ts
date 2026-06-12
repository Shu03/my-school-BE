import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import {
    ArrayNotEmpty,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

import { ALL_PERMISSIONS, Permission } from "@common/constants";

export class UpdatePresetDto {
    @ApiPropertyOptional({ example: "Senior Class Teacher" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @IsOptional()
    public name?: string;

    @ApiPropertyOptional({
        example: ["ATTENDANCE_READ", "ATTENDANCE_WRITE", "GRADES_READ"],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsIn([...ALL_PERMISSIONS], { each: true })
    @IsOptional()
    public permissions?: Permission[];
}
