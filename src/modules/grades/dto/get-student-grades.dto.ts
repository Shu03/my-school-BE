import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsUUID } from "class-validator";

export class GetStudentGradesDto {
    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;
}
