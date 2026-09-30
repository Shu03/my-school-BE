import { ApiProperty } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RejectAccessRequestDto {
    @ApiProperty({ example: "A subject teacher is already assigned to this section" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    public remarks!: string;
}
