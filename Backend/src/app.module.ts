import { Module } from '@nestjs/common';
import { UserController } from './controllers/user';
import { WalletController } from './controllers/wallet';
import { UserServices } from './services/user';
import { WalletServices } from './services/wallet';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    UserController,
    WalletController,
  ],
  providers: [
    UserServices,
    WalletServices,
  ],
})
export class AppModule {}
