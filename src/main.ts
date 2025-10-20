import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import * as promClient from 'prom-client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',').map(s => s.trim());
  app.enableCors({ origin: allowedOrigins });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');

  const cfg = new DocumentBuilder()
    .setTitle('Inventory API').setDescription('Car inventory endpoints').setVersion('0.1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup('api/docs', app, doc);

  const reg = new promClient.Registry();
  promClient.collectDefaultMetrics({ register: reg });
  app.getHttpAdapter().getInstance().get('/metrics', async (_req: Request, res: Response) => {
    res.setHeader('Content-Type', reg.contentType);
    res.send(await reg.metrics());
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
