import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
    @ApiProperty({ example: "John" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public firstName!: string;

    @ApiProperty({ example: "Doe" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    public lastName!: string;

    @ApiProperty({ example: "9876543210" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsMobilePhone("en-IN")
    @IsNotEmpty()
    public mobileNumber!: string;

    @ApiPropertyOptional({ example: "john@example.com" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsEmail()
    @IsOptional()
    @MaxLength(255)
    public email?: string;
}

export class CreateAdminDto extends BaseCreateUserDto {}

export class CreateTeacherDto extends BaseCreateUserDto {
    @ApiProperty({ example: "TCH001" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    public employeeCode!: string;

    @ApiPropertyOptional({ example: "2024-01-15" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public joiningDate?: string;
}

export class CreateStudentDto extends BaseCreateUserDto {
    @ApiProperty({ example: "ADM001" })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    public admissionNumber!: string;

    @ApiPropertyOptional({ example: "2010-05-15" })
    @IsISO8601({ strict: true })
    @IsOptional()
    public dateOfBirth?: string;
}
