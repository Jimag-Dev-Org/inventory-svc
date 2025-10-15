import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as promClient from 'prom-client';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const cfg = new DocumentBuilder()
    .setTitle('Inventory API')
    .setDescription('Car inventory endpoints')
    .setVersion('0.1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup('api/docs', app, doc);

  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });
  app.getHttpAdapter().getInstance().get('/metrics', async (_req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();