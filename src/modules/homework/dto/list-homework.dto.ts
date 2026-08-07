import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsUUID } from "class-validator";

export class ListHomeworkDto {
    @ApiPropertyOptional({ example: "uuid-of-class" })
    @IsUUID()
    @IsOptional()
    public classId?: string;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;
}
