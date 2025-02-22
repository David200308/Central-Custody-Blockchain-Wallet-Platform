import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { fetch } from 'undici';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://10.128.0.2:3100';

interface WalletRequestData {
    uid: string;
}

export const verifyToken = async (token: string, uid: string) => {
    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!publicKey) return false;

    try {
        const payload = jwt.verify(token, publicKey, { algorithms: ["ES256"] });
        if (typeof payload === 'string') return false;
        
        if (payload.aud !== uid) return false;
        return true;
    } catch (error) {
        return false;
    }
};

export const createWalletAndGetAddress = onCall(
    {
        region: 'us-central1',
        memory: '256MiB',
        timeoutSeconds: 540,
        vpcConnector: 'key-service-connector',
        secrets: ['JWT_PUBLIC_KEY']
    },
    async (request: CallableRequest<WalletRequestData>) => {
        try {
            const headers = request.rawRequest.headers;
            const authHeader = headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Unauthorized request');
            }

            const { uid } = request.data;
            if (!uid || typeof uid !== 'string') {
                throw new Error('Invalid or missing UID');
            }

            const token = authHeader.split(' ')[1];
            if (await verifyToken(token, request.data.uid) === false) {
                throw new Error('Unauthorized request');
            }

            const generateRes = await fetch(`${BASE_URL}/generateKey/${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (!generateRes.ok) {
                logger.error(`UID: ${uid} - Failed to create wallet`);
                throw new Error('Failed to create wallet');
            }

            const addressRes = await fetch(`${BASE_URL}/getAddress/${uid}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!addressRes.ok) {
                logger.error(`UID: ${uid} - Failed to get wallet address`);
                throw new Error('Failed to get wallet');
            }

            const address = await addressRes.text();
            logger.info(`UID: ${uid} - Address: ${address}`);

            return { address };
        } catch (err) {
            logger.error('Unexpected error:', err);
            throw new Error('Internal server error');
        }
    }
);


