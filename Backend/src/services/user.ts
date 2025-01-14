import { connection } from "../database/database";
import { SignUpSchema, User, Logs, CreateLogSchema, CreateAuthRecordSchema, CreatePasskeySchema } from "../schemas/user";
import { Inject, Injectable } from '@nestjs/common';
import { base64ToUint8Array, mysqlAESDecrypt, mysqlAESEncrypt } from "../utils/auth";
import {
    CREATE_USER_SQL,
    ENABLE_PASSKEY_SQL,
    GET_USER_BY_EMAIL_SQL,
    GET_USER_BY_ID_SQL,
} from "../database/sql/user";
import {
    CREATE_PASSKEY_SQL,
    GET_PASSKEY_BY_PASSKEY_UID_SQL,
    UPDATE_PASSKEY_COUNT_SQL
} from "../database/sql/passkey";
import {
    CREATE_LOG_SQL,
    GET_LOGS_BY_USERID
} from "../database/sql/logs";
import {
    CREATE_AUTH_SQL
} from "../database/sql/auth";
import {
    CREATE_MFA_SQL,
    GET_MFA_BY_USER_ID_NOT_VERIFY_SQL,
    GET_MFA_BY_USER_ID_SQL,
    UPDATE_MFA_INITIAL_SETUP_SQL
} from "../database/sql/mfa";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from 'cache-manager';

@Injectable()
export class UserServices {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    createUser = async (data: SignUpSchema) => {
        const searchUser = await this.getUserByEmail(data.email);
        if (searchUser) {
            throw new Error('Email already exists');
        }
        const sql = CREATE_USER_SQL;
        const [result] = await connection.promise().query(sql, data);
        return result;
    };

    getUserByEmail = async (email: string) => {
        try {
            const sql = GET_USER_BY_EMAIL_SQL;
            const [rows] = await connection.promise().query(sql, email);
            const data = rows[0] as User;
            return data;
        } catch (error) {
            return;
        }
    }

    // getUserByName = async (username: string) => {
    //     try {
    //         const sql = GET_USER_BY_NAME_SQL;
    //         const [rows] = await connection.promise().query(sql, username);
    //         const data = rows[0] as User;
    //         return data;
    //     } catch (error) {
    //         throw new Error(error);
    //     }
    // }

    getUserById = async (id: number): Promise<User> => {
        try {
            const sql = GET_USER_BY_ID_SQL;
            const [rows] = await connection.promise().query(sql, id);
            const data = rows[0] as User;
            return data;
        } catch (error) {
            throw new Error(error);
        }
    }

    createAuthRecord = async (data: CreateAuthRecordSchema) => {
        const encryptedIp = await mysqlAESEncrypt(data.ipAddress);
        // const encryptedDeviceName = await mysqlAESEncrypt(data.loginDeviceName);
        const encryptedLocation = await mysqlAESEncrypt(data.loginLocation);
        if (encryptedIp) {
            data.ipAddress = encryptedIp;
        }
        // if (encryptedDeviceName) {
        //     data.loginDeviceName = encryptedDeviceName;
        // }
        if (encryptedLocation) {
            data.loginLocation = encryptedLocation;
        }
        const sql = CREATE_AUTH_SQL;
        const [result] = await connection.promise().query(sql, data);
        return result;
    };

    createPasskey = async (data: CreatePasskeySchema) => {
        const sql = CREATE_PASSKEY_SQL;
        const [result] = await connection.promise().query(sql, data);
        return result;
    };

    getPasskeyByPasskeyUid = async (passkeyUid: string) => {
        try {
            const sql = GET_PASSKEY_BY_PASSKEY_UID_SQL;
            const [rows] = await connection.promise().query(sql, passkeyUid);
            const data = rows[0];
            return {
                userID: data.user_id,
                credentialID: data.passkey_uid,
                credentialPublicKey: base64ToUint8Array(data.public_key),
                counter: data.counter,
                transports: data.transports ? data.transports.split(',') : [],
            };
        } catch (error) {
            console.log(error);
            return null;
        }
    };

    updatePasskeyCounter = async (passkeyUid: string, counter: number) => {
        try {
            const sql = UPDATE_PASSKEY_COUNT_SQL;
            const [result] = await connection.promise().query(sql, [counter, passkeyUid]);
            return result;
        } catch (error) {
            throw new Error(error);
        }
    };

    enablePasskey = async (userId: number) => {
        try {
            const sql = ENABLE_PASSKEY_SQL;
            await connection.promise().query(sql, userId);
            return true;
        } catch (error) {
            return false;
        }
    };

    createMFA = async (userId: number, mfaKey: string) => {
        try {
            const sql = CREATE_MFA_SQL;
            const encryptedMFAKey = await mysqlAESEncrypt(mfaKey);
            await connection.promise().query(sql, {
                user_id: userId,
                mfa_key: encryptedMFAKey
            });
            return true;
        } catch (error) {
            return false;
        }
    };

    getMFANotVerifyByUserId = async (userId: number) => {
        try {
            const sql = GET_MFA_BY_USER_ID_NOT_VERIFY_SQL;
            const [rows] = await connection.promise().query(sql, userId);
            const data = rows[0];
            if (data) {
                const decryptedMFAKey = await mysqlAESDecrypt(data.mfa_key);
                if (decryptedMFAKey) {
                    data.mfa_key = decryptedMFAKey;
                }
            }
            return data;
        } catch (error) {
            return null;
        }
    }

    createLog = async (data: CreateLogSchema) => {
        // const encryptedData = await mysqlAESEncrypt(data.content);
        // if (encryptedData) {
        //     data.content = encryptedData;
        // }
        const sql = CREATE_LOG_SQL;
        const [result] = await connection.promise().query(sql, data);
        return result;
    };

    getLogsByUserId = async (userId: number) => {
        const sql = GET_LOGS_BY_USERID;
        const [rows] = await connection.promise().query(sql, userId);
        const data = rows as Logs[];
        // decrypt logs
        // data.forEach(async(log) => {
        //     const decryptedData = await mysqlAESDecrypt(log.content);
        //     if (decryptedData) {
        //         log.content = decryptedData;
        //     }
        // });

        return data;
    };

}
