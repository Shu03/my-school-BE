import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

export class CreateBillDto {
    @ApiProperty({ example: "uuid-of-withdrawal" })
    @IsUUID()
    public withdrawalId!: string;

    @ApiProperty({ example: 1200 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(9999999999.99)
    public amount!: number;

    @ApiProperty({ example: "2026-06-12" })
    @IsISO8601({ strict: true })
    public billedOn!: string;

    @ApiProperty({ example: "Petrol" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public category!: string;

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
