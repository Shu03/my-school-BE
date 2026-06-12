import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignPresetDto {
    @ApiProperty({ example: "uuid-of-preset" })
    @IsUUID()
    @IsNotEmpty()
    public presetId!: string;
}
