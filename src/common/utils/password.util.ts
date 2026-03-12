import * as crypto from "crypto";

import * as bcrypt from "bcrypt";

import { SALT_ROUNDS, TEMP_PASSWORD_CHARS, TEMP_PASSWORD_LENGTH } from "@common/constants";

export const generateTempPassword = (): string => {
    const bytes = crypto.randomBytes(TEMP_PASSWORD_LENGTH);
    return Array.from(bytes)
        .map((byte) => TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length])
        .join("");
};

export const hashPassword = async (plain: string): Promise<string> => {
    return bcrypt.hash(plain, SALT_ROUNDS);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(plain, hash);
};
