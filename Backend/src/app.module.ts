import { Module } from '@nestjs/common';
import { UserController } from './controllers/user';
import { WalletController } from './controllers/wallet';
import { UserServices } from './services/user';
import { WalletServices } from './services/wallet';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { CacheModule } from '@nestjs/cache-manager';
import { BlockchainController } from './controllers/blockchain';
import { BlockchainServices } from './services/blockchain';

@Module({
  imports: [
    CacheModule.register(),
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    UserController,
    WalletController,
    BlockchainController,
  ],
  providers: [
    UserServices,
    WalletServices,
    BlockchainServices,
  ],
})
export class AppModule {}
