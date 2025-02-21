import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { fetch } from 'undici';

const BASE_URL = 'http://10.128.0.2:3100';

interface WalletRequestData {
    uid: string;
}

export const createWalletAndGetAddress = onCall(
    {
        region: 'us-central1',
        memory: '256MiB',
        timeoutSeconds: 540,
        vpcConnector: 'key-service-connector',
    },
    async (request: CallableRequest<WalletRequestData>) => {
        try {
            const headers = request.rawRequest.headers;
            if (
                !headers.referer?.startsWith('https://wallet.api.skyproton.com') &&
                !headers.origin?.startsWith('https://wallet.api.skyproton.com')
            ) {
                throw new Error('Unauthorized request');
            }

            const { uid } = request.data;
            if (!uid || typeof uid !== 'string') {
                throw new Error('Invalid or missing UID');
            }

            // Generate wallet
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
