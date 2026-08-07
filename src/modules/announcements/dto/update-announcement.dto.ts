import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAnnouncementDto {
    @ApiPropertyOptional({ example: "School reopens on Monday" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(200)
    @IsOptional()
    public title?: string;

    @ApiPropertyOptional({ example: "All students should report by 8:00 AM in full uniform." })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MaxLength(5000)
    @IsOptional()
    public content?: string;
}
