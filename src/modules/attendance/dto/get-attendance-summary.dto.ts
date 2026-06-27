import { ApiProperty } from "@nestjs/swagger";

import { IsString, IsUUID, Matches } from "class-validator";

export class GetAttendanceSummaryDto {
    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    public classId!: string;

    @ApiProperty({ example: "2026-06", description: "Month in YYYY-MM format" })
    @IsString()
    @Matches(/^\d{4}-\d{2}$/)
    public month!: string;
}
