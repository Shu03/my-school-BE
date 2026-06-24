import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class EnrollStudentDto {
    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    @IsNotEmpty()
    public classId!: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ example: "01" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    @IsOptional()
    public rollNumber?: string;
}
