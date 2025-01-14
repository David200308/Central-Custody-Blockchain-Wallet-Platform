import { compare, hash } from "bcryptjs";
import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from "../database/database";
import { randomBytes, randomInt } from 'crypto';
import 'dotenv/config';
import { readFileSync } from "fs";

const SQLI_BLACKLIST = ["'", '"', ";", "--", "/*", "*/", "=", "%", "<", ">", "(", ")", "$", "&", "|", "^", "~", "`", "+", "[", "]", "{", "}", "\\", "/", ":", ",", "?", "_", " ", "\t", "\n", "\r", "\x00", "\x1a"];

export const sqliCheck = (input: string) => {
    for (const sqli of SQLI_BLACKLIST) {
        if (input.includes(sqli)) return true;
    }
    return false;
};

export const passwordHash = async (password: string) => {
    const hashedPassword = await hash(password, 10);
    return hashedPassword;
};

export const passwordVerify = async (password: string, hashedPassword: string) => {
    const result = await compare(password, hashedPassword);
    return result;
};

export const generateToken = (payload: JwtPayload, expireFast: boolean) => {
    // use ES256 algorithm to sign payload
    const privateKey = process.env.JWT_PRIVATE_KEY;

    // const JWTPRKF = readFileSync(process.env.JWT_PRIVATE_KEY_FILE, 'utf8').trim();
    // const privateKey = JWTPRKF.replace(/\\n/g, '\n');
    const token = sign(payload, privateKey, {
        algorithm: "ES256",
        // expireFast true 5 minuties, false 1 hour
        expiresIn: expireFast ? "5m" : "1h"
    });

    return token;
};

export const verifyToken = async (token: string) => {
    const publicKey = process.env.JWT_PUBLIC_KEY;

    // const JWTPUKF = readFileSync(process.env.JWT_PUBLIC_KEY_FILE, 'utf8').trim();
    // const publicKey = JWTPUKF.replace(/\\n/g, '\n');
    const payload = verify(token, publicKey, {
        algorithms: ["ES256"]
    });
    if (!payload) throw new Error('Invalid token');
    if (typeof payload === 'string') throw new Error('Invalid token');
    return payload;
};

export function validateEmail(email: string) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}

export function generateUuid() {
    return uuidv4();
}

export function generateRandom6Digits() {
    const timestamp = Date.now();
    const randomPart = randomInt(0, 1000000);
    const combinedNumber = (timestamp + randomPart) % 1000000;
    const sixDigitNumber = combinedNumber.toString().padStart(6, '0');
    return parseInt(sixDigitNumber, 10);
}

export const rpName = (): string => { return process.env.PASSKEY_RPNAME_FILE; };
export const rpID = (): string => { return process.env.PASSKEY_RPID_FILE; };
export const origin = (): string => { return process.env.PASSKEY_ORIGIN_FILE; };

// export const rpName = (): string => { return readFileSync(process.env.PASSKEY_RPNAME_FILE, 'utf8').trim(); }; 
// export const rpID = (): string => { return readFileSync(process.env.PASSKEY_RPID_FILE, 'utf8').trim(); }; 
// export const origin = (): string => { return readFileSync(process.env.PASSKEY_ORIGIN_FILE, 'utf8').trim(); }; 

export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string =>
    Buffer.from(uint8Array).toString('base64');
 
export const base64ToUint8Array = (base64: string): Uint8Array =>
    new Uint8Array(Buffer.from(base64, 'base64'));

export const intToUint8Array = (num: number): Uint8Array => {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, num);
    return new Uint8Array(buffer);
}

export const uint8ArrayToInt = (uint8Array: Uint8Array): number =>
    new DataView(uint8Array.buffer).getUint32(0);

export async function postgresAESEncrypt(data: string): Promise<string | null> {
    // const key = readFileSync(process.env.AES_KEY_FILE, 'utf8').trim();
    const key = process.env.AES_KEY;
    const iv = randomBytes(16).toString('hex'); // Generating a random 16-byte IV
    
    const encryptedQuery = `
        SELECT encode(
            pgp_sym_encrypt($1, $2, 
                gen_salt('aes', 256), 
                'cipher-algo=aes256,iv=' || decode($3, 'hex')
            ), 'hex') AS encrypted;
    `;
    
    const { rows } = await pool.query(encryptedQuery, [data, key, iv]);

    return rows[0] ? rows[0].encrypted + ':' + iv : null;
}

export async function postgresAESDecrypt(encryptedData: string): Promise<string | null> {
    // const key = readFileSync(process.env.AES_KEY_FILE, 'utf8').trim();
    const key = process.env.AES_KEY;
    const [data, iv] = encryptedData.split(':');
    
    const decryptedQuery = `
        SELECT convert_from(
            pgp_sym_decrypt(decode($1, 'hex'), $2, 'cipher-algo=aes256,iv=' || decode($3, 'hex')),
            'UTF8'
        ) AS decrypted;
    `;

    const { rows } = await pool.query(decryptedQuery, [data, key, iv]);

    return rows[0] ? rows[0].decrypted : null;
}
