import * as crypto from "crypto";

import * as bcrypt from "bcrypt";

import { SALT_ROUNDS, TEMP_PASSWORD_CHARS, TEMP_PASSWORD_LENGTH } from "@common/constants";

export const generateTempPassword = (): string => {
    const chars: string[] = [];
    while (chars.length < TEMP_PASSWORD_LENGTH) {
        const value = crypto.randomInt(TEMP_PASSWORD_CHARS.length);
        chars.push(TEMP_PASSWORD_CHARS[value]);
    }
    return chars.join("");
};

export const hashPassword = async (plain: string): Promise<string> => {
    return bcrypt.hash(plain, SALT_ROUNDS);
};

export const comparePassword = async (plain: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(plain, hash);
};

export const hashToken = (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
