import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class BlockchainServices {
    private readonly logger = new Logger(BlockchainServices.name);

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async getChainGas(chainId: number): Promise<number> {
        try {
            const cacheKey = `gasFee_chain_${chainId}`;
            const cachedGasFee = await this.cacheManager.get<string>(cacheKey);

            if (cachedGasFee !== undefined) {
                this.logger.log(`Returning cached gas fee for chain ${chainId}: ${cachedGasFee}`);
                return parseFloat(cachedGasFee);
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
            const mediumFee = parseFloat(data?.medium?.suggestedMaxFeePerGas);

            if (isNaN(mediumFee)) {
                throw new Error('Medium gas fee not found or invalid in API response');
            }

            await this.cacheManager.set(cacheKey, mediumFee.toString(), 60 * 10);

            this.logger.log(`Fetched and cached medium gas fee for chain ${chainId}: ${mediumFee}`);
            return mediumFee;
        } catch (error) {
            this.logger.error(`Error fetching gas fee for chain ${chainId}: ${error.message}`);
            throw error;
        }
    }
}
