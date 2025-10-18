import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async list(q: { make?: string; limit: number; offset: number }) {
    return this.prisma.car.findMany({
      where: q.make ? { make: { equals: q.make, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: q.offset,
      take: q.limit,
      select: { id: true, vin: true, make: true, model: true, year: true, priceCents: true, mileage: true, color: true, condition: true }
    });
  }

  async get(id: string) {
    return this.prisma.car.findUniqueOrThrow({
      where: { id },
      select: { id: true, vin: true, make: true, model: true, year: true, priceCents: true, mileage: true, color: true, condition: true, description: true }
    });
  }
}
