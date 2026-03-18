import { Role } from "@prisma/client";

export type JwtPayload = {
    sub: string;
    role: Role;
    permissions: string[];
    type: "access" | "first_login";
    iat?: number;
    exp?: number;
};

export type RefreshTokenPayload = {
    sub: string;
    family: string;
    type: "refresh";
    iat?: number;
    exp?: number;
};

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type LoginResponse = AuthTokens & {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        role: Role;
    };
};

export type FirstLoginResponse = {
    forcePasswordChange: true;
    firstLoginToken: string;
};

export type AuthResponse = LoginResponse | FirstLoginResponse;
