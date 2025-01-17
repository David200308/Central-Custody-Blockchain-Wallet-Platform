import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { checkEnv } from './utils/env';
import * as basicAuth from 'express-basic-auth';
import 'dotenv/config';
import { checkDBConnection } from './database/database';
import "./instrument";
import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
class HealthCheckMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    const token = req.headers['x-health-check-token'];
    if (token !== process.env.HEALTH_CHECK_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    next();
  }
}

async function bootstrap() {
  checkEnv();
  checkDBConnection();

  const app = await NestFactory.create(AppModule);
  
  app.use(
    ['/docs'],
    basicAuth({
      challenge: true,
      users: { 
        [process.env.DOCS_USER]: process.env.DOCS_PASSWORD
      },
    }),
  );

  // health check
  app.use('/health', new HealthCheckMiddleware().use);
  app.use('/health', (req, res, next) => {
    res.send('ok');
    next();
  });

  app.use(cookieParser());
  const config = new DocumentBuilder()
    .setTitle('Central Custody Blockchain Wallet Platform Backend API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  // testing cors
  // app.enableCors({
  //   origin: '*',
  // });

  // production cors
  app.enableCors({
    origin: process.env.PASSKEY_ORIGIN,
  });

  await app.listen(3001);
}
bootstrap();
