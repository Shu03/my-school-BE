import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

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

    // Swagger — only in non-production
    if (nodeEnv !== "production") {
        const config = new DocumentBuilder()
            .setTitle("My School API")
            .setDescription("School Management System REST API")
            .setVersion("1.0")
            .addBearerAuth()
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup("api/docs", app, document);
        logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
    }

    await app.listen(port);
    logger.log(`Application running on http://localhost:${port}/api/v1`);
    logger.log(`Health check at http://localhost:${port}/api/v1/health`);
    logger.log(`Environment: ${nodeEnv}`);
}

void bootstrap();
