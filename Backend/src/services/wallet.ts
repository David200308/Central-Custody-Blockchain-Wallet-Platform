import { pool } from "../database/database";
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class WalletServices {
    private readonly logger = new Logger(WalletServices.name);
    
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async getWalletByUserId(userId: number): Promise<String> {
        return "0x1234567890";
    };

}
