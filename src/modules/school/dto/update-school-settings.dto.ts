import { ApiProperty } from "@nestjs/swagger";

import { ArrayNotEmpty, IsArray, IsInt, Max, Min } from "class-validator";

export class UpdateSchoolSettingsDto {
    @ApiProperty({
        example: [0, 6],
        description: "0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat",
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(6, { each: true })
    public weeklyOffDays!: number[];
}
