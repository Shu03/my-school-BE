import { Transform } from "class-transformer";
import { IsMobilePhone, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsMobilePhone("en-IN")
    @IsNotEmpty()
    public mobileNumber: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(72)
    public password: string;
}
