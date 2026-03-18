import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { TOKEN_TYPE_ACCESS } from "@common/constants";

import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    public constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>("jwt.accessSecret")!,
        });
    }

    public async validate(payload: JwtPayload): Promise<JwtPayload> {
        // Only accept access tokens — not refresh or first_login
        if (payload.type !== TOKEN_TYPE_ACCESS) {
            throw new UnauthorizedException("Invalid token type");
        }

        // Check user still exists and is active
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { isActive: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException("Account not found or deactivated");
        }

        return payload;
    }
}
