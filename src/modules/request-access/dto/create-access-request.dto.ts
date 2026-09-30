import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { AccessType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateAccessRequestDto {
    @ApiProperty({ enum: AccessType, example: AccessType.HOMEWORK })
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

    @ApiProperty({ example: "Covering Maths for 5A while the subject teacher is on leave" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    public reason!: string;
}
