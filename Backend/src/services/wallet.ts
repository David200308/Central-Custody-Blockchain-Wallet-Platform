import { pool } from "../database/database";
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { web3Provider } from "../utils/blockchain";
import { ADD_WALLET_SQL, GET_WALLET_BY_USER_ID_SQL } from "../database/sql/wallet/wallet";
import { generateUuid } from "../utils/auth";

@Injectable()
export class WalletServices {
    private readonly logger = new Logger(WalletServices.name);
    private readonly createWalletfunctionURL = 'https://us-central1-wallet-platform.cloudfunctions.net/createWalletAndGetAddress';

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async createWallet(uid: string, token: string): Promise<string> {
        try {
            const response = await fetch(this.createWalletfunctionURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorizationwallet': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    data: { uid },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Error calling Firebase function:', error);
                throw new Error('Failed to create wallet: ' + error);
            }

            const createWalletResponse = await response.json();
            const address = createWalletResponse.result;
            console.log('Wallet address for UID:', uid, 'is:', address);
            
            const client = await pool.connect();
            const sql = ADD_WALLET_SQL;
            await client.query(sql, [generateUuid(), uid, address]);
            client.release();

            return address;
        } catch (error) {
            console.error('Error calling Firebase function:', error);
            throw new Error('Failed to create wallet: ' + error);
        }
    }

    async getWalletByUserId(userId: number): Promise<string> {
        const client = await pool.connect();
        const sql = GET_WALLET_BY_USER_ID_SQL;
        const result = await client.query(sql, [userId]);
        client.release();

        return result.rows[0].wallet_address;
    };

    async signMessage(userId: number, message: Object): Promise<string> {
        return "test_signature_message";
    }

    async signTransaction(userId: number, transaction: Object): Promise<string> {
        return "test_signature_transaction";
    }

    async getNewTransactionNonce(walletAddress: string, chainId: number): Promise<number> {
        const transactionCount = await web3Provider(chainId).eth.getTransactionCount(walletAddress, 'pending');
        return Number(transactionCount);
    }

    async getTransactions(walletAddress: string, chainId: number): Promise<Object[]> {
        const transactionCount = await web3Provider(chainId).eth.getTransactionCount(walletAddress);

        const transactions = [];
        for (let i = Number(transactionCount) - 1; i >= 0; i--) {
            const transaction = await web3Provider(chainId).eth.getTransactionFromBlock(i, walletAddress);
            if (transaction) {
                transactions.push(transaction);
            }
        }

        return transactions;
    }

    async getTransactionsCount(walletAddress: string, chainId: number): Promise<number> {
        const transactionCount = await web3Provider(chainId).eth.getTransactionCount(walletAddress);
        return Number(transactionCount);
    }

    async getWalletBalance(walletAddress: string, chainId: number): Promise<number> {
        const balance = await web3Provider(chainId).eth.getBalance(walletAddress);
        return Number(balance);
    }

}
