import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateAnnouncementDto {
    @ApiProperty({ example: "School reopens on Monday" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    public title!: string;

    @ApiProperty({ example: "All students should report by 8:00 AM in full uniform." })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    public content!: string;
}
