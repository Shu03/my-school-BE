import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { Request } from "express";

import { TOKEN_TYPE_ACCESS, TOKEN_TYPE_FIRST_LOGIN } from "@common/constants";

import { JwtPayload } from "@modules/auth";

@Injectable()
export class JwtChangePasswordGuard implements CanActivate {
    public constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) {}

    public canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();

        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing token");
        }

        const token = authHeader.substring(7);

        try {
            const payload = this.jwt.verify<JwtPayload>(token, {
                secret: this.config.get<string>("jwt.accessSecret"),
            });

            if (payload.type !== TOKEN_TYPE_ACCESS && payload.type !== TOKEN_TYPE_FIRST_LOGIN) {
                throw new UnauthorizedException("Invalid token type");
            }

            request.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
