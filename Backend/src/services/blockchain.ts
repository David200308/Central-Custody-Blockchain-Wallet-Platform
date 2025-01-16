import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class BlockchainServices {
    private readonly logger = new Logger(BlockchainServices.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async getChainGas(chainId: number): Promise<Object> {
        try {
            const feePerGasCacheKey = `chain_${chainId}_fee_per_gas`;
            const priorityFeePerGasCacheKey = `chain_${chainId}_priority_fee_per_gas`;
            const cachedFeePerGas = await this.cacheManager.get<string>(feePerGasCacheKey);
            const cachedPriorityFeePerGas = await this.cacheManager.get<string>(priorityFeePerGasCacheKey);

            if (cachedFeePerGas !== undefined && cachedPriorityFeePerGas !== undefined) {
                this.logger.log(`Returning cached gas fee for chain ${chainId}: ${cachedFeePerGas}`);
                return {
                    "feePerGas": parseFloat(cachedFeePerGas),
                    "priorityFeePerGas": parseFloat(cachedPriorityFeePerGas)
                };
            }

            const apiKey = process.env.INFURA_API_KEY;
            const url = `https://gas.api.infura.io/v3/${apiKey}/networks/${chainId}/suggestedGasFees`;

            const response = await fetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch gas fees: ${response.statusText}`);
            }

            const data = await response.json();
            const feePerGas = parseFloat(data?.medium?.suggestedMaxFeePerGas);
            const priorityFeePerGas = parseFloat(data?.medium?.suggestedMaxPriorityFeePerGas);

            if (isNaN(feePerGas) || isNaN(priorityFeePerGas)) {
                throw new Error('Invalid gas fee');
            }

            await this.cacheManager.set(feePerGasCacheKey, feePerGas.toString(), 60 * 10);
            await this.cacheManager.set(priorityFeePerGasCacheKey, priorityFeePerGas.toString(), 60 * 10);

            this.logger.log(`Cached ${chainId} Gas: ${feePerGas} Gwei (feePerGas) and ${priorityFeePerGas} Gwei (priorityFeePerGas)`);
            return {
                "feePerGas": feePerGas,
                "priorityFeePerGas": priorityFeePerGas
            };
        } catch (error) {
            this.logger.error(`Error fetching gas fee for chain ${chainId}: ${error.message}`);
            throw error;
        }
    }
}
