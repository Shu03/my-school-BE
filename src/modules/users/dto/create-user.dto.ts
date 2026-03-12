import { Transform } from "class-transformer";
import {
    IsEmail,
    IsISO8601,
    IsMobilePhone,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

class BaseCreateUserDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public firstName: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public lastName: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsMobilePhone("en-IN")
    @IsNotEmpty()
    public mobileNumber: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsEmail()
    @IsOptional()
    @MaxLength(255)
    public email?: string;
}

export class CreateAdminDto extends BaseCreateUserDto {}

export class CreateTeacherDto extends BaseCreateUserDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    public employeeCode: string;

    @IsISO8601({ strict: true })
    @IsOptional()
    public joiningDate?: string;
}

export class CreateStudentDto extends BaseCreateUserDto {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    public admissionNumber: string;

    @IsISO8601({ strict: true })
    @IsOptional()
    public dateOfBirth?: string;
}
