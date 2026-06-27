import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateHolidayDto {
    @ApiProperty({ example: "Independence Day" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;

    @ApiProperty({ example: "2026-08-15" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public date!: string;

    @ApiProperty({ example: "uuid-of-academic-year" })
    @IsUUID()
    public academicYearId!: string;
}
