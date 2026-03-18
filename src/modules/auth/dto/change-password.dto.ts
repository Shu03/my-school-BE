import { IsNotEmpty, IsOptional, IsString, MinLength, Matches, MaxLength } from "class-validator";

export class ChangePasswordDto {
    @IsString()
    @IsOptional()
    @MaxLength(72)
    public currentPassword?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
        message:
            "newPassword must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    })
    public newPassword: string;
}
