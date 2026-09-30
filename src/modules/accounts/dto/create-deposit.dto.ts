import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateDepositDto {
    @ApiProperty({ example: 100000 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(9999999999.99)
    public amount!: number;

    @ApiProperty({ example: "2026-06-01" })
    @IsISO8601({ strict: true })
    public depositedOn!: string;

    @ApiPropertyOptional({ example: "Initial funds" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(500)
    @IsOptional()
    public note?: string;
}
