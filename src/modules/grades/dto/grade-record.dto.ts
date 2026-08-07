import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class GradeRecordDto {
    @ApiProperty({ example: "uuid-of-student" })
    @IsUUID()
    public studentId!: string;

    @ApiProperty({ example: 85 })
    @IsNumber()
    @Min(0)
    public marksObtained!: number;

    @ApiPropertyOptional({ example: "Good improvement" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(500)
    @IsOptional()
    public remarks?: string;
}
