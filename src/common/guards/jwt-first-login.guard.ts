import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { JWT_FIRST_LOGIN_STRATEGY } from "@common/constants";

@Injectable()
export class JwtFirstLoginGuard extends AuthGuard(JWT_FIRST_LOGIN_STRATEGY) {}
