// inventory-svc/src/cars.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { Prisma } from '@prisma/client';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'mileage_asc';

export type ListQuery = {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;    // dollars (will convert to cents)
  priceMax?: number;    // dollars (will convert to cents)
  mileageMax?: number;
  sort: SortKey;
  page: number;
  pageSize: number;
};

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListQuery) {
    const where: Prisma.CarWhereInput = {};

    if (q.make)  where.make  = { equals: q.make,  mode: 'insensitive' };
    if (q.model) where.model = { equals: q.model, mode: 'insensitive' };

    if (q.yearMin || q.yearMax) {
      where.year = {};
      if (q.yearMin != null) (where.year as Prisma.IntFilter).gte = q.yearMin;
      if (q.yearMax != null) (where.year as Prisma.IntFilter).lte = q.yearMax;
    }

    if (q.priceMin != null || q.priceMax != null) {
      const minC = q.priceMin != null ? Math.round(q.priceMin * 100) : undefined;
      const maxC = q.priceMax != null ? Math.round(q.priceMax * 100) : undefined;
      where.priceCents = {};
      if (minC != null) (where.priceCents as Prisma.IntFilter).gte = minC;
      if (maxC != null) (where.priceCents as Prisma.IntFilter).lte = maxC;
    }

    if (q.mileageMax != null) {
      where.mileage = { lte: q.mileageMax };
    }

    // ✅ Strongly-typed orderBy so TS keeps 'asc' | 'desc' literals
    let orderBy: Prisma.CarOrderByWithRelationInput;
    switch (q.sort) {
      case 'price_asc':
        orderBy = { priceCents: 'asc' };
        break;
      case 'price_desc':
        orderBy = { priceCents: 'desc' };
        break;
      case 'mileage_asc':
        orderBy = { mileage: 'asc' };
        break;
      default: // 'newest'
        orderBy = { createdAt: 'desc' };
    }

    const page = Math.max(1, q.page || 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.car.count({ where }),
      this.prisma.car.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          vin: true,
          make: true,
          model: true,
          year: true,
          priceCents: true,
          mileage: true,
          color: true,
          condition: true,
        },
      }),
    ]);

    return { items, page, pageSize, total };
  }

  async get(id: string) {
    return this.prisma.car.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        vin: true,
        make: true,
        model: true,
        year: true,
        priceCents: true,
        mileage: true,
        color: true,
        condition: true,
        description: true,
      },
    });
  }
}
