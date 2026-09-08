import { ApiProperty } from "@nestjs/swagger";

import { IsISO8601, IsNotEmpty, IsUUID } from "class-validator";

export class GetAttendanceDto {
    @ApiProperty({ example: "uuid-of-class" })
    @IsUUID()
    public sectionId!: string;

    @ApiProperty({ example: "2026-06-27" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public date!: string;
}
