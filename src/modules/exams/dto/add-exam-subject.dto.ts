import { ApiProperty } from "@nestjs/swagger";

import { IsISO8601, IsNotEmpty, IsNumber, IsUUID, Max, Min } from "class-validator";

export class AddExamSubjectDto {
    @ApiProperty({ example: "uuid-of-subject" })
    @IsUUID()
    public subjectId!: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    @Max(1000)
    public totalMarks!: number;

    @ApiProperty({ example: "2026-08-04" })
    @IsISO8601({ strict: true })
    @IsNotEmpty()
    public date!: string;
}
