import { ApiPropertyOptional } from "@nestjs/swagger";

import { FeeRecordStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class ListFeeRecordsDto {
    @ApiPropertyOptional({ example: "uuid-of-class" })
    @IsUUID()
    @IsOptional()
    public classId?: string;

    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;

    @ApiPropertyOptional({ enum: FeeRecordStatus, example: FeeRecordStatus.PENDING })
    @IsEnum(FeeRecordStatus)
    @IsOptional()
    public status?: FeeRecordStatus;
}
