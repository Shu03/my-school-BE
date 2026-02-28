import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
(config as any)();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set in .env");
}

export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        url: databaseUrl,
    },
});
