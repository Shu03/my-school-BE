import * as fs from "fs";
import * as path from "path";

import { Logger } from "@nestjs/common";

import { EnvConfig, envValidationSchema } from "./env.validation";

const logger = new Logger("EnvConfig");

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;

        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed
            .substring(eqIndex + 1)
            .trim()
            .replace(/^"|"$/g, "");

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

const parsed = envValidationSchema.safeParse(process.env);

if (!parsed.success) {
    logger.error("❌ Invalid environment variables:");
    logger.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env: EnvConfig = parsed.data;
