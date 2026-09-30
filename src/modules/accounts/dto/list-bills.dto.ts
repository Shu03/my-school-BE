import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsUUID } from "class-validator";

import { ListAccountEntriesDto } from "./list-account-entries.dto";

export class ListBillsDto extends ListAccountEntriesDto {
    @ApiPropertyOptional({ example: "uuid-of-withdrawal" })
    @IsUUID()
    @IsOptional()
    public withdrawalId?: string;
}
