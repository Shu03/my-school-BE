import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { JWT_FIRST_LOGIN_STRATEGY, TOKEN_TYPE_FIRST_LOGIN } from "@common/constants";

import { JwtPayload } from "@modules/auth";

@Injectable()
export class JwtFirstLoginStrategy extends PassportStrategy(Strategy, JWT_FIRST_LOGIN_STRATEGY) {
    public constructor(private readonly config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>("jwt.accessSecret") ?? "",
        });
    }

    public validate(payload: JwtPayload): JwtPayload {
        if (payload.type !== TOKEN_TYPE_FIRST_LOGIN) {
            throw new UnauthorizedException("Invalid token type");
        }

        return payload;
    }
}
