import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsISO8601, IsOptional, IsUUID } from "class-validator";

export class GetStudentAttendanceDto {
    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ example: "2026-06-01" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public startDate?: string;

    @ApiPropertyOptional({ example: "2026-06-30" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public endDate?: string;
}
