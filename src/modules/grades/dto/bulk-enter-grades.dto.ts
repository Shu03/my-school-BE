import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, ValidateNested } from "class-validator";

import { GradeRecordDto } from "./grade-record.dto";

export class BulkEnterGradesDto {
    @ApiProperty({ type: [GradeRecordDto] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => GradeRecordDto)
    public records!: GradeRecordDto[];
}
