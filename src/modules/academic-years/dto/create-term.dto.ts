import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTermDto {
    @ApiProperty({ example: "Term 1" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public name!: string;

    @ApiProperty({ example: "2024-04-01" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public startDate!: string;

    @ApiProperty({ example: "2024-08-31" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public endDate!: string;
}
