import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateWithdrawalDto {
    @ApiPropertyOptional({ example: 6000 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(9999999999.99)
    @IsOptional()
    public amount?: number;

    @ApiPropertyOptional({ example: "2026-06-11" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public withdrawnOn?: string;

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
