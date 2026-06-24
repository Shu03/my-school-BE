import { ApiPropertyOptional } from "@nestjs/swagger";

import { EnrollmentStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateEnrollmentDto {
    @ApiPropertyOptional({ enum: EnrollmentStatus, example: EnrollmentStatus.PROMOTED })
    @IsEnum(EnrollmentStatus)
    @IsOptional()
    public status?: EnrollmentStatus;

    @ApiPropertyOptional({ example: "05" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    @IsOptional()
    public rollNumber?: string;
}
