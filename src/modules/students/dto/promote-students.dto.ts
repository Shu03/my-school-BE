import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from "class-validator";

export class PromoteStudentsDto {
    @ApiProperty({ example: ["uuid-1", "uuid-2"] })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID("4", { each: true })
    public studentIds!: string[];

    @ApiProperty({ example: "uuid-of-target-class" })
    @IsUUID()
    public targetClassId!: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;
}
