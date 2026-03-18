import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiOkResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBadRequestResponse,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Public, Roles } from "@common/decorators";
import { JwtChangePasswordGuard } from "@common/guards";

import { AuthService } from "./auth.service";
import { JwtPayload } from "./auth.types";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    public constructor(private readonly authService: AuthService) {}

    @Post("login")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login with mobile number and password" })
    @ApiOkResponse({ description: "Login successful" })
    @ApiUnauthorizedResponse({ description: "Invalid credentials" })
    @ApiForbiddenResponse({ description: "Account deactivated" })
    public async login(@Body() dto: LoginDto): Promise<ReturnType<AuthService["login"]>> {
        return this.authService.login(dto);
    }

    @Post("refresh")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Rotate refresh token" })
    @ApiOkResponse({ description: "Tokens rotated successfully" })
    @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token" })
    public async refresh(
        @Body() dto: RefreshTokenDto,
    ): Promise<ReturnType<AuthService["refresh"]>> {
        return this.authService.refresh(dto);
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Logout and revoke all sessions" })
    @ApiOkResponse({ description: "Logged out successfully" })
    @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
    public async logout(@CurrentUser() user: JwtPayload): Promise<void> {
        return this.authService.logout(user.sub);
    }

    @Post("change-password")
    @Public()
    @UseGuards(JwtChangePasswordGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Change password — first login or voluntary" })
    @ApiOkResponse({ description: "Password changed successfully" })
    @ApiUnauthorizedResponse({ description: "Invalid token or wrong current password" })
    @ApiBadRequestResponse({ description: "Validation failed or same password" })
    public async changePassword(
        @CurrentUser() user: JwtPayload,
        @Body() dto: ChangePasswordDto,
    ): Promise<ReturnType<AuthService["changePassword"]>> {
        return this.authService.changePassword(user.sub, user.type, dto);
    }

    @Post("admin/reset-password")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Admin resets any user password" })
    @ApiOkResponse({ description: "Password reset successfully" })
    @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
    @ApiForbiddenResponse({ description: "Admin access required" })
    public async adminResetPassword(
        @Body() dto: ResetPasswordDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AuthService["adminResetPassword"]>> {
        return this.authService.adminResetPassword(dto, user.sub);
    }

    @Get("me")
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get current authenticated user profile" })
    @ApiOkResponse({ description: "Profile retrieved successfully" })
    public async getMe(@CurrentUser() user: JwtPayload): Promise<ReturnType<AuthService["getMe"]>> {
        return this.authService.getMe(user.sub);
    }
}
