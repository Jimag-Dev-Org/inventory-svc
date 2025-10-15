import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { CarsController } from './cars.controller.js';

@Module({ controllers: [HealthController, CarsController] })
export class AppModule {}