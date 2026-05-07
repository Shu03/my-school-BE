import { Logger } from "@nestjs/common";

import { config } from "dotenv";

import { EnvConfig, envValidationSchema } from "./env.validation";

const logger = new Logger("EnvConfig");

config();

const parsed = envValidationSchema.safeParse(process.env);

if (!parsed.success) {
    logger.error("❌ Invalid environment variables:");
    logger.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env: EnvConfig = parsed.data;
