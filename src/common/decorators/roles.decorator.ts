import { SetMetadata } from "@nestjs/common";

import { Role } from "@prisma/client";

import { ROLES_KEY } from "@common/constants";

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
    SetMetadata(ROLES_KEY, roles);
