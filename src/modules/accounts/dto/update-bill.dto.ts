import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import {
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class UpdateBillDto {
    @ApiPropertyOptional({ example: "uuid-of-withdrawal" })
    @IsUUID()
    @IsOptional()
    public withdrawalId?: string;

    @ApiPropertyOptional({ example: 1300 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(9999999999.99)
    @IsOptional()
    public amount?: number;

    @ApiPropertyOptional({ example: "2026-06-13" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public billedOn?: string;

    @ApiPropertyOptional({ example: "Food" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsOptional()
    public category?: string;

    @ApiPropertyOptional({ example: "HP Petrol Pump" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(200)
    @IsOptional()
    public vendor?: string;

    @ApiPropertyOptional({ example: "INV-2026-0042" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(100)
    @IsOptional()
    public billNumber?: string;

    @ApiPropertyOptional({ example: "School bus refuel" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(500)
    @IsOptional()
    public note?: string;
}
