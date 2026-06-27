import { ApiProperty } from "@nestjs/swagger";

import { AttendanceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsISO8601,
    IsNotEmpty,
    IsUUID,
    ValidateNested,
} from "class-validator";

export class AttendanceRecordDto {
    @ApiProperty({ example: "uuid-of-student-profile" })
    @IsUUID()
    public studentId!: string;

    @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
    @IsEnum(AttendanceStatus)
    public status!: AttendanceStatus;
}

export class BulkMarkAttendanceDto {
    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    public classId!: string;

    @ApiProperty({ example: "2026-06-27" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public date!: string;

    @ApiProperty({ type: [AttendanceRecordDto] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => AttendanceRecordDto)
    public records!: AttendanceRecordDto[];
}
