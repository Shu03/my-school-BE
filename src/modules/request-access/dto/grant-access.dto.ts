import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { AccessType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class GrantAccessDto {
    @ApiProperty({ example: "uuid-of-teacher-user" })
    @IsUUID()
    public requesterId!: string;

    @ApiProperty({ enum: AccessType, example: AccessType.MARKS })
    @IsEnum(AccessType)
    public type!: AccessType;

    @ApiPropertyOptional({ example: "uuid-of-section" })
    @IsUUID()
    @IsOptional()
    public sectionId?: string;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;

    @ApiPropertyOptional({ example: "Assigned to evaluate the unit test papers" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @IsOptional()
    public remarks?: string;
}
