import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { Role } from "@prisma/client";

import { PERMISSIONS_KEY } from "@common/constants";

import { JwtPayload } from "@modules/auth";

@Injectable()
export class PermissionsGuard implements CanActivate {
    public constructor(private readonly reflector: Reflector) {}

    public canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
        const user = request.user;

        // Admins bypass permission checks — implicit full access
        if (user.role === Role.ADMIN) return true;

        // All other roles — check permissions array
        // Students have [] by default, teachers have assigned permissions
        // Any role can be granted permissions in the future without touching this guard
        return requiredPermissions.every((permission) => user.permissions.includes(permission));
    }
}
