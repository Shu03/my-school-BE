import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { ALL_PERMISSIONS, Permission } from "@common/constants";

export class CreatePresetDto {
    @ApiProperty({ example: "Class Teacher" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public name!: string;

    @ApiProperty({ example: ["ATTENDANCE_READ", "ATTENDANCE_WRITE"] })
    @IsArray()
    @ArrayNotEmpty()
    @IsIn([...ALL_PERMISSIONS], { each: true })
    public permissions!: Permission[];
}
