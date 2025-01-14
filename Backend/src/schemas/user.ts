import { RegistrationResponseJSON } from '@simplewebauthn/server';

export type User = {
    id: number;
    email: string;
    createAt: Date;
    updateAt: Date;
    latestLoginAt: Date;
    passkeyEnabled: boolean;
};

// loginMethod: general, qr, notification, passkey
export type Auth = {
    auth_id: number;
    auth_uuid: string;
    user_id: number;
    loginAt: Date;
    ipAddress: string;
    loginMethod: "passkey";
    loginDeviceName: string;
    loginLocation: string;
    notificationId?: string;
    qrId?: string;
};

// loginMethod: general, qr, notification, passkey
export type CreateAuthRecordSchema = {
    auth_uuid: string;
    user_id: number;
    ipAddress: string;
    loginMethod: "passkey";
    loginDeviceName: string;
    loginLocation: string;
}

export type Passkey = {
    passkey_id: number;
    user_id: number;
    passkey_uid: string;
    public_key: string;
    counter: number;
    transports: string;
    createdAt: Date;
};

export type Logs = {
    log_id: number,
    user_id: number,
    log_time: Date,
    content: string
}

export type CreatePasskeyRequestBodySchema = {
    passkeyOptions: RegistrationResponseJSON;
    challenge: string;
}

export type CreatePasskeySchema = {
    user_id: number;
    passkey_uid: string;
    public_key: string;
    counter: number;
    transports: string;
}

export type CreateLogSchema = {
    user_id: number;
    content: string;
}

export type SignUpSchema = {
    email: string;
}

export type ReturnUserSchema = {
    id: number;
    email: string;
    createAt: Date;
    updateAt: Date;
}
