import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateHomeworkDto {
    @ApiProperty({ example: "Chapter 5 exercises" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    public title!: string;

    @ApiProperty({ example: "Complete questions 1 to 10 from the workbook" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    public description!: string;

    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    public sectionId!: string;

    @ApiProperty({ example: "uuid-of-subject" })
    @IsUUID()
    public subjectId!: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiProperty({ example: "2026-08-10" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public dueDate!: string;
}
