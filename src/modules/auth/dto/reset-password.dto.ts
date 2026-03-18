import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class ResetPasswordDto {
    @IsUUID()
    @IsNotEmpty()
    @IsString()
    public userId: string;
}
