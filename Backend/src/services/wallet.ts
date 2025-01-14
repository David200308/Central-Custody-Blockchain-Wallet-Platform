import { connection } from "../database/database";
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from 'cache-manager';

@Injectable()
export class WalletServices {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }


}
