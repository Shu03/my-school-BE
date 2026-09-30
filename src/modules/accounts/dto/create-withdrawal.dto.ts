import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateWithdrawalDto {
    @ApiProperty({ example: 5000 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(9999999999.99)
    public amount!: number;

    @ApiProperty({ example: "2026-06-10" })
    @IsISO8601({ strict: true })
    public withdrawnOn!: string;

    @ApiPropertyOptional({ example: "Ramesh Patil" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(200)
    @IsOptional()
    public withdrawnBy?: string;

    @ApiPropertyOptional({ example: "Monthly petty cash" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(500)
    @IsOptional()
    public note?: string;
}
