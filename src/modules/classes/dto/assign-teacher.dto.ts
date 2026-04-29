import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignTeacherDto {
    @ApiProperty({ example: "uuid-of-teacher-profile" })
    @IsUUID()
    @IsNotEmpty()
    public teacherId!: string;
}
