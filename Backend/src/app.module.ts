import { Module } from '@nestjs/common';
import { UserController } from './controllers/user';
import { UserServices } from './services/user';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [UserController],
  providers: [
    UserServices,
  ],
})
export class AppModule {}
