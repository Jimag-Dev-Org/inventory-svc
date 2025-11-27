// src/health.controller.ts
import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: is the process up?
  @Get('healthz')
  get() {
    return { status: 'ok' };
  }

  // Readiness: can we talk to the database?
  @Get('readyz')
  async readiness() {
    try {
      // Simple DB ping: if this throws, DB is not healthy/connected
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        checks: {
          database: 'ok',
        },
      };
    } catch (err) {
      // 503 = Service Unavailable, which is what K8s expects
      throw new HttpException(
        {
          status: 'error',
          checks: {
            database: 'error',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
