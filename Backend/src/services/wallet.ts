import { pool } from "../database/database";
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { web3Provider } from "../utils/blockchain";

@Injectable()
export class WalletServices {
    private readonly logger = new Logger(WalletServices.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async getWalletByUserId(userId: number): Promise<string> {
        return "0x1234567890";
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
