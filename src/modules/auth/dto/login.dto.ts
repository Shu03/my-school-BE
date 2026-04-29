import { ApiPropertyOptional } from "@nestjs/swagger";

import { Transform } from "class-transformer";
import { IsMobilePhone, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
    @ApiPropertyOptional({ example: "9999999999" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsMobilePhone("en-IN")
    @IsNotEmpty()
    public mobileNumber!: string;

    @ApiPropertyOptional({ example: "Admin@1234" })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(72)
    public password!: string;
}
