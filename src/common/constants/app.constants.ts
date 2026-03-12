// Bcrypt
export const SALT_ROUNDS = 12;

// Password generation
export const TEMP_PASSWORD_LENGTH = 12;
export const TEMP_PASSWORD_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Sessions
export const MAX_ACTIVE_SESSIONS = 3;

// JWT
export const JWT_ACCESS_EXPIRES_IN = "15m";
export const JWT_REFRESH_EXPIRES_IN = "7d";
