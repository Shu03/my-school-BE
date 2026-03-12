import { Role } from "@prisma/client";
import { Transform } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "@common/constants";

export class ListUsersDto {
    @IsEnum(Role)
    @IsOptional()
    public role?: Role;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }: { value: string }) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
    })
    public isActive?: boolean;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    @Transform(({ value }: { value: string }) => value?.trim())
    public search?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public page?: number = DEFAULT_PAGE;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(MAX_PAGE_LIMIT)
    @Transform(({ value }: { value: string }) => parseInt(value, 10))
    public limit?: number = DEFAULT_PAGE_LIMIT;
}
