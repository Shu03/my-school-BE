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

// Token types
export const TOKEN_TYPE_ACCESS = "access";
export const TOKEN_TYPE_FIRST_LOGIN = "first_login";
export const TOKEN_TYPE_REFRESH = "refresh";

// First login token expiry — always fixed regardless of config
export const FIRST_LOGIN_TOKEN_EXPIRY = "15m";

// Guard metadata keys
export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";
export const PERMISSIONS_KEY = "permissions";

// Passport strategy names
export const JWT_STRATEGY = "jwt";
export const JWT_FIRST_LOGIN_STRATEGY = "jwt-first-login";

// Permission flags
export const PERMISSION_LEAVE_APPLY = "LEAVE_APPLY";
export const PERMISSION_ACADEMIC_YEAR_MANAGE = "ACADEMIC_YEAR_MANAGE";
