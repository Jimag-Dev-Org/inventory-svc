import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { CarsController } from './cars.controller.js';
import { PrismaService } from './prisma.service.js';
import { CarsService } from './cars.service.js';

@Module({
  controllers: [HealthController, CarsController],
  providers: [PrismaService, CarsService],
})
export class AppModule {}
