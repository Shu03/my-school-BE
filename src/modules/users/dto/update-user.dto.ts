import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @IsOptional()
    public firstName?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @IsOptional()
    public lastName?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsEmail()
    @IsOptional()
    @MaxLength(255)
    public email?: string;
}
