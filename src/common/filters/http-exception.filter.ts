import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    public catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { status, message } = this.resolveException(exception);

        const errorResponse = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        };

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        } else {
            this.logger.warn(`${request.method} ${request.url} ${status}`);
        }

        response.status(status).json(errorResponse);
    }

    private resolveException(exception: unknown): {
        status: number;
        message: string;
    } {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const message =
                typeof response === "string"
                    ? response
                    : typeof response === "object" && "message" in response
                      ? String((response as Record<string, unknown>).message)
                      : "An error occurred";

            return {
                status: exception.getStatus(),
                message,
            };
        }

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            return this.resolvePrismaError(exception);
        }

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Internal server error",
        };
    }

    private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
        status: number;
        message: string;
    } {
        switch (exception.code) {
            case "P2002": {
                const fields = (
                    exception.meta as Record<string, string[]> | undefined
                )?.target?.join(", ");
                return {
                    status: HttpStatus.CONFLICT,
                    message: fields
                        ? `A record with this ${fields} already exists`
                        : "A record with this value already exists",
                };
            }
            case "P2025": {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "Record not found",
                };
            }
            default: {
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: "A database error occurred",
                };
            }
        }
    }
}
