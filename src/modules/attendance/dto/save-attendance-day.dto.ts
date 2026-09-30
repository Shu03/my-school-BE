import { ApiProperty } from "@nestjs/swagger";

import { ArrayUnique, IsArray, IsUUID } from "class-validator";

export class SaveAttendanceDayDto {
    @ApiProperty({
        example: ["uuid-of-student-profile"],
        description: "Students absent on this day. Everyone else enrolled is marked present.",
    })
    @IsArray()
    @ArrayUnique()
    @IsUUID("all", { each: true })
    public absentStudentIds!: string[];
}
