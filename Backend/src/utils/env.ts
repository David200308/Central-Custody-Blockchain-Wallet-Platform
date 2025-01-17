import * as fs from 'fs';
import 'dotenv/config';

export const checkEnv = () => {
    const requiredEnvVars = [
        { varName: 'DB_URL', isFile: false },
        { varName: 'JWT_PRIVATE_KEY', isFile: false },
        { varName: 'JWT_PUBLIC_KEY', isFile: false },
        { varName: 'DOCS_USER', isFile: false },
        { varName: 'DOCS_PASSWORD', isFile: false },
        { varName: 'PASSKEY_RPNAME', isFile: false },
        { varName: 'PASSKEY_RPID', isFile: false },
        { varName: 'PASSKEY_ORIGIN', isFile: false },
        { varName: 'AES_KEY', isFile: false },
        { varName: 'SENTRY_DSN', isFile: false },
        { varName: 'INFURA_API_KEY', isFile: false },
        { varName: 'HEALTH_CHECK_TOKEN', isFile: false },
    ];

    for (const { varName, isFile } of requiredEnvVars) {
        if (isFile) {
            const filePath = process.env[`${varName}_FILE`];
            if (!filePath || !fs.existsSync(filePath)) {
                throw new Error(`Missing or invalid file path for ${varName}_FILE`);
            }
            const value = fs.readFileSync(filePath, 'utf-8').trim();
            if (!value) {
                throw new Error(`File ${filePath} for ${varName}_FILE is empty`);
            }
            process.env[varName] = value;
        } else if (!process.env[varName]) {
            throw new Error(`Please provide ${varName} in the environment`);
        }
    }
};
