import { ApiProperty } from "@nestjs/swagger";

import { IsArray, IsIn } from "class-validator";

import { ALL_PERMISSIONS, Permission } from "@common/constants";

export class UpdatePermissionsDto {
    @ApiProperty({
        example: ["ANNOUNCEMENTS_MANAGE"],
        description:
            "Full list of permission overrides for this teacher. Replaces existing overrides entirely.",
    })
    @IsArray()
    @IsIn([...ALL_PERMISSIONS], { each: true })
    public permissionOverrides!: Permission[];
}
