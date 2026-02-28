import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    timestamp: string;
    data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    public intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const statusCode = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;

        return next.handle().pipe(
            map((data) => ({
                success: true,
                statusCode,
                timestamp: new Date().toISOString(),
                data,
            })),
        );
    }
}
