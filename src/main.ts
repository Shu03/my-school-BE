import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { GlobalExceptionFilter } from "@common/filters";
import { ResponseInterceptor } from "@common/interceptors";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    const logger = new Logger("Bootstrap");
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>("app.port") ?? 3000;
    const nodeEnv = configService.get<string>("app.nodeEnv") ?? "development";

    // Global prefix
    app.setGlobalPrefix("api/v1");

    // CORS
    app.enableCors({
        origin: nodeEnv === "production" ? false : "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Global response interceptor
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.listen(port);
    logger.log(`🚀 Application running on http://localhost:${port}/api/v1`);
    logger.log(`🏥 Health check at http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
}

void bootstrap();
