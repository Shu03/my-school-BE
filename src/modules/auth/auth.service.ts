import * as crypto from "crypto";

import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";

import { Role } from "@prisma/client";
import { addDays } from "date-fns/addDays";
import { addHours } from "date-fns/addHours";
import { addMinutes } from "date-fns/addMinutes";

import {
    FIRST_LOGIN_TOKEN_EXPIRY,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_FIRST_LOGIN,
    TOKEN_TYPE_REFRESH,
    MAX_ACTIVE_SESSIONS,
} from "@common/constants";
import { hashToken, comparePassword, hashPassword, generateTempPassword } from "@common/utils";

import { PrismaService } from "@modules/prisma";
import { UsersService, UserWithProfiles } from "@modules/users";

import { AuthResponse, AuthTokens, JwtPayload, RefreshTokenPayload } from "./auth.types";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly users: UsersService,
    ) {}

    private signAccessToken(
        userId: string,
        role: Role,
        permissions: string[],
        type: "access" | "first_login" = TOKEN_TYPE_ACCESS,
    ): string {
        const payload: JwtPayload = {
            sub: userId,
            role,
            permissions,
            type,
        };

        return this.jwt.sign(payload, {
            secret: this.config.get<string>("jwt.accessSecret"),
            expiresIn:
                type === TOKEN_TYPE_FIRST_LOGIN
                    ? FIRST_LOGIN_TOKEN_EXPIRY
                    : this.config.get<string>("jwt.accessExpiresIn"),
        } as JwtSignOptions);
    }

    private signRefreshToken(userId: string, family: string): string {
        const payload: RefreshTokenPayload = {
            sub: userId,
            family,
            type: TOKEN_TYPE_REFRESH,
        };

        return this.jwt.sign(payload, {
            secret: this.config.get<string>("jwt.refreshSecret"),
            expiresIn: this.config.get<string>("jwt.refreshExpiresIn"),
        } as JwtSignOptions);
    }

    private async revokeAllUserTokens(userId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
    }

    public async login(dto: LoginDto): Promise<AuthResponse> {
        // Step 1 — find user
        const user = await this.prisma.user.findUnique({
            where: { mobileNumber: dto.mobileNumber },
            include: { teacherProfile: true },
        });

        // Steps 2 + 3 — validate credentials (same error for both)
        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const passwordValid = await comparePassword(dto.password, user.password);

        if (!passwordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Step 4 — check active status
        if (!user.isActive) {
            throw new ForbiddenException("Account has been deactivated");
        }

        // Step 5 — first login
        if (user.isFirstLogin) {
            const firstLoginToken = this.signAccessToken(
                user.id,
                user.role,
                [],
                TOKEN_TYPE_FIRST_LOGIN,
            );

            return {
                forcePasswordChange: true,
                firstLoginToken,
            };
        }

        // Step 6 — get effective permissions for teachers
        const permissions = await this.getEffectivePermissions(user.teacherProfile);

        // Step 7 — sign tokens
        const accessToken = this.signAccessToken(user.id, user.role, permissions);

        const family = crypto.randomUUID();
        const refreshToken = this.signRefreshToken(user.id, family);
        const tokenHash = hashToken(refreshToken);

        // Step 8 — enforce session limit + store refresh token atomically
        const expiresIn = this.config.get<string>("jwt.refreshExpiresIn") ?? "7d";
        const expiresAt = this.getTokenExpiry(expiresIn);

        await this.prisma.$transaction(async (tx) => {
            const activeSessions = await tx.refreshToken.findMany({
                where: {
                    userId: user.id,
                    isRevoked: false,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: "asc" },
            });

            if (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
                await tx.refreshToken.update({
                    where: { id: activeSessions[0].id },
                    data: { isRevoked: true },
                });
            }

            await tx.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    family,
                    expiresAt,
                },
            });
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    }

    private async getEffectivePermissions(
        teacherProfile: { presetId: string | null; permissionOverrides: string[] } | null,
    ): Promise<string[]> {
        if (!teacherProfile) return [];

        if (!teacherProfile.presetId) {
            return teacherProfile.permissionOverrides;
        }

        const preset = await this.prisma.permissionPreset.findUnique({
            where: { id: teacherProfile.presetId },
        });

        if (!preset) return teacherProfile.permissionOverrides;

        // Additive merge only — permissionOverrides adds to preset permissions.
        // To remove a preset permission, update the preset itself or remove the preset entirely.
        const merged = new Set([...preset.permissions, ...teacherProfile.permissionOverrides]);

        return Array.from(merged);
    }

    // Supports d (days), h (hours), m (minutes) only.
    // Defaults to 7 days for unrecognized units.
    private getTokenExpiry(expiry: string): Date {
        const unit = expiry.slice(-1);
        const value = parseInt(expiry.slice(0, -1), 10);
        const now = new Date();

        switch (unit) {
            case "d":
                return addDays(now, value);
            case "h":
                return addHours(now, value);
            case "m":
                return addMinutes(now, value);
            default:
                return addDays(now, 7);
        }
    }

    public async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
        // Step 1 — verify JWT signature and expiry
        let payload: RefreshTokenPayload;

        try {
            payload = this.jwt.verify<RefreshTokenPayload>(dto.refreshToken, {
                secret: this.config.get<string>("jwt.refreshSecret"),
            });
        } catch {
            throw new UnauthorizedException("Invalid refresh token");
        }

        // Step 2 — must be a refresh token
        if (payload.type !== TOKEN_TYPE_REFRESH) {
            throw new UnauthorizedException("Invalid token type");
        }

        // Step 3 — look up token in DB with user in single query
        const tokenHash = hashToken(dto.refreshToken);
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    include: {
                        teacherProfile: true,
                    },
                },
            },
        });

        // Step 4 — reuse detection
        if (!storedToken) {
            // Token not found — possible reuse of already rotated token
            // Revoke entire family as precaution
            await this.prisma.refreshToken.updateMany({
                where: { family: payload.family, isRevoked: false },
                data: { isRevoked: true },
            });
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (storedToken.isRevoked) {
            // Token found but revoked — definite reuse attack
            // Revoke entire family
            await this.prisma.refreshToken.updateMany({
                where: { family: storedToken.family, isRevoked: false },
                data: { isRevoked: true },
            });
            throw new UnauthorizedException("Token reuse detected");
        }

        // Step 5 — check DB expiry
        if (storedToken.expiresAt < new Date()) {
            throw new UnauthorizedException("Refresh token expired");
        }

        // Step 6 — validate user
        const user = storedToken.user;

        if (!user || !user.isActive) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        // Step 7 — get permissions
        const permissions = await this.getEffectivePermissions(user.teacherProfile);

        // Step 8 — issue new tokens
        const accessToken = this.signAccessToken(user.id, user.role, permissions);

        const newRefreshToken = this.signRefreshToken(user.id, storedToken.family);
        const newTokenHash = hashToken(newRefreshToken);

        // Step 9 — rotate — revoke old, store new atomically
        const expiresIn = this.config.get<string>("jwt.refreshExpiresIn") ?? "7d";
        const expiresAt = this.getTokenExpiry(expiresIn);

        await this.prisma.$transaction([
            this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { isRevoked: true },
            }),
            this.prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash: newTokenHash,
                    family: storedToken.family,
                    expiresAt,
                },
            }),
        ]);

        return { accessToken, refreshToken: newRefreshToken };
    }

    public async logout(userId: string): Promise<void> {
        await this.revokeAllUserTokens(userId);
    }

    public async changePassword(
        userId: string,
        tokenType: "access" | "first_login",
        dto: ChangePasswordDto,
    ): Promise<AuthResponse> {
        // Step 1 — get user
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { teacherProfile: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Step 2 — handle based on token type
        if (tokenType === TOKEN_TYPE_ACCESS) {
            // Voluntary change — current password required
            if (!dto.currentPassword) {
                throw new BadRequestException("Current password is required");
            }

            const passwordValid = await comparePassword(dto.currentPassword, user.password);

            if (!passwordValid) {
                throw new UnauthorizedException("Current password is incorrect");
            }
        }

        // Step 3 — ensure new password differs from current
        const isSamePassword = await comparePassword(dto.newPassword, user.password);

        if (isSamePassword) {
            throw new BadRequestException("New password must differ from current password");
        }

        // Step 4 — hash new password
        const hashedPassword = await hashPassword(dto.newPassword);

        // Step 5 — update password and flip isFirstLogin if needed
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                ...(tokenType === TOKEN_TYPE_FIRST_LOGIN && {
                    isFirstLogin: false,
                }),
            },
        });

        // Step 6 — revoke all sessions
        await this.revokeAllUserTokens(userId);

        // Step 7 — issue fresh tokens
        const permissions = await this.getEffectivePermissions(user.teacherProfile);

        const accessToken = this.signAccessToken(user.id, user.role, permissions);

        const family = crypto.randomUUID();
        const refreshToken = this.signRefreshToken(user.id, family);
        const tokenHash = hashToken(refreshToken);

        const expiresIn = this.config.get<string>("jwt.refreshExpiresIn") ?? "7d";
        const expiresAt = this.getTokenExpiry(expiresIn);

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                family,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    }

    public async adminResetPassword(
        dto: ResetPasswordDto,
        adminId: string,
    ): Promise<{ tempPassword: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: dto.userId },
                data: {
                    password: hashedPassword,
                    isFirstLogin: true,
                    resetPasswordById: adminId,
                    resetPasswordAt: new Date(),
                },
            }),
            this.prisma.refreshToken.updateMany({
                where: {
                    userId: dto.userId,
                    isRevoked: false,
                },
                data: { isRevoked: true },
            }),
        ]);

        return { tempPassword };
    }

    public async getMe(userId: string): Promise<UserWithProfiles> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            omit: { password: true },
            include: {
                teacherProfile: true,
                studentProfile: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        return user;
    }
}
