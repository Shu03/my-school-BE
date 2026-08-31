import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsUUID } from "class-validator";

export class BackfillFeesDto {
    @ApiPropertyOptional({ example: "uuid-of-academic-year" })
    @IsUUID()
    @IsOptional()
    public academicYearId?: string;
}
