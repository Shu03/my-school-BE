import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class RecordPaymentDto {
    @ApiProperty({ example: 5000 })
    @IsNumber()
    @Min(0.01)
    public amount!: number;

    @ApiProperty({ example: "2026-06-15" })
    @IsISO8601({ strict: true })
    public paidOn!: string;

    @ApiPropertyOptional({ example: "Paid by cheque no. 123456" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(500)
    @IsOptional()
    public note?: string;
}
