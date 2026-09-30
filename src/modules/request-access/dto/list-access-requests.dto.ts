import { ApiPropertyOptional } from "@nestjs/swagger";

import { AccessRequestStatus, AccessType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@common/constants";

export class ListMyAccessRequestsDto {
    @ApiPropertyOptional({ enum: AccessRequestStatus })
    @IsEnum(AccessRequestStatus)
    @IsOptional()
    public status?: AccessRequestStatus;

    @ApiPropertyOptional({ enum: AccessType })
    @IsEnum(AccessType)
    @IsOptional()
    public type?: AccessType;

    @ApiPropertyOptional({ example: "uuid-of-section" })
    @IsUUID()
    @IsOptional()
    public sectionId?: string;

    @ApiPropertyOptional({ example: "uuid-of-subject" })
    @IsUUID()
    @IsOptional()
    public subjectId?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public page?: number = DEFAULT_PAGE;

    @ApiPropertyOptional({ example: 20 })
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_LIMIT)
    @IsOptional()
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public limit?: number = DEFAULT_PAGE_LIMIT;
}

export class ListAccessRequestsDto extends ListMyAccessRequestsDto {
    @ApiPropertyOptional({ example: "uuid-of-teacher-user" })
    @IsUUID()
    @IsOptional()
    public requesterId?: string;
}
