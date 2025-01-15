import { pool } from "../database/database";
import { SignUpSchema, User, Logs, CreateLogSchema, CreateAuthRecordSchema, CreatePasskeySchema } from "../schemas/user";
import { Inject, Injectable } from '@nestjs/common';
import { base64ToUint8Array } from "../utils/auth";
import {
    CREATE_USER_SQL,
    ENABLE_PASSKEY_SQL,
    GET_USER_BY_EMAIL_PASSKEY_DISABLED_SQL,
    GET_USER_BY_EMAIL_SQL,
    GET_USER_BY_ID_SQL,
} from "../database/sql/user/user";
import {
    CREATE_PASSKEY_SQL,
    GET_PASSKEY_BY_PASSKEY_UID_SQL,
    UPDATE_PASSKEY_COUNT_SQL
} from "../database/sql/user/passkey";
import {
    CREATE_LOG_SQL,
    GET_LOGS_BY_USERID
} from "../database/sql/user/logs";
import {
    CREATE_AUTH_SQL
} from "../database/sql/user/auth";

@Injectable()
export class UserServices {
    createUser = async (data: SignUpSchema) => {
        const searchUser = await this.getUserByEmail(data.email);
        if (searchUser) {
            throw new Error('Email already exists');
        }
        const sql = CREATE_USER_SQL;
        const client = await pool.connect();
        const result = await client.query(sql, [data.email]);

        return result;
    };

    getUserByEmail = async (email: string) => {
        try {
            const sql = GET_USER_BY_EMAIL_SQL;
            const client = await pool.connect();
            const result = await client.query(sql, [email]);
            return result.rows[0] as User;
        } catch (error) {
            return;
        }
    };

    getUserByEmailWherePasskeyDisabled = async (email: string) => {
        try {
            const sql = GET_USER_BY_EMAIL_PASSKEY_DISABLED_SQL;
            const client = await pool.connect();
            const result = await client.query(sql, [email]);
            return result.rows[0] as User;
        } catch (error) {
            return;
        }
    };

    getUserById = async (id: number): Promise<User> => {
        try {
            const sql = GET_USER_BY_ID_SQL;
            const client = await pool.connect();
            const result = await client.query(sql, [id]);
            return result.rows[0] as User;
        } catch (error) {
            throw new Error(error);
        }
    }

    createAuthRecord = async (data: CreateAuthRecordSchema) => {
        const sql = CREATE_AUTH_SQL;
        const client = await pool.connect();
        const result = await client.query(sql, [
            data.auth_uuid, 
            data.user_id, 
            data.loginMethod
        ]);
        return result;
    };

    createPasskey = async (data: CreatePasskeySchema) => {
        const sql = CREATE_PASSKEY_SQL;
        const client = await pool.connect();
        const result = await client.query(sql, [
            data.user_id, 
            data.passkey_uid, 
            data.public_key,
            data.counter, 
            data.transports
        ]);
        return result;
    };

    getPasskeyByPasskeyUid = async (passkeyUid: string) => {
        try {
            const sql = GET_PASSKEY_BY_PASSKEY_UID_SQL;
            const client = await pool.connect();
            const result = await client.query(sql, [passkeyUid]);
            const rows = result.rows;
            if (rows.length === 0) {
                return null;
            }

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
            const client = await pool.connect();
            const result = await client.query(sql, [counter, passkeyUid]);
            return result;
        } catch (error) {
            throw new Error(error);
        }
    };

    enablePasskey = async (userId: number) => {
        try {
            const sql = ENABLE_PASSKEY_SQL;
            const client = await pool.connect();
            await client.query(sql, [userId]);
            return true;
        } catch (error) {
            return false;
        }
    };

    createLog = async (data: CreateLogSchema) => {
        const sql = CREATE_LOG_SQL;
        const client = await pool.connect();
        const result = await client.query(sql, [
            data.user_id, 
            data.content
        ]);
        return result;
    };

    getLogsByUserId = async (userId: number) => {
        const sql = GET_LOGS_BY_USERID;
        const client = await pool.connect();
        const result = await client.query(sql, [userId]);
        const rows = result.rows;
        if (rows.length === 0) {
            return null;
        }

        const data = rows as Logs[];
        return data;
    };

}
