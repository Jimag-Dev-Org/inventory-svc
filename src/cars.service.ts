// inventory-svc/src/cars.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

type AddCarImageInput = {
  s3KeyOriginal?: string;
  key?: string;
  s3Key?: string;
  altText?: string;
  order?: number;
};

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  private imageUrl(key?: string | null) {
    if (!key) return undefined;

    const base = process.env.PUBLIC_IMAGE_BASE?.replace(/\/$/, '');
    if (!base) return undefined;

    return `${base}/${key}`;
  }

  private normalizeImage(image: {
    id: string;
    s3KeyOriginal: string;
    altText: string | null;
    order: number;
  }) {
    const url = this.imageUrl(image.s3KeyOriginal);

    return {
      ...image,
      url,
      publicUrl: url,
    };
  }

  async list(q: ListQuery) {
    const where: Prisma.CarWhereInput = {};

    if (q.make) where.make = { equals: q.make, mode: 'insensitive' };
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
      default:
        orderBy = { createdAt: 'desc' };
    }

    const page = Math.max(1, q.page || 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const [total, cars] = await this.prisma.$transaction([
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
          images: {
            orderBy: { order: 'asc' },
            take: 1,
            select: {
              id: true,
              s3KeyOriginal: true,
              altText: true,
              order: true,
            },
          },
        },
      }),
    ]);

    const items = cars.map((car) => {
      const firstImage = car.images[0]
        ? this.normalizeImage(car.images[0])
        : undefined;

      return {
        ...car,
        images: firstImage ? [firstImage] : [],
        primaryImageUrl: firstImage?.url,
      };
    });

    return { items, page, pageSize, total };
  }

  async get(id: string) {
    const car = await this.prisma.car.findUnique({
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
        images: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            s3KeyOriginal: true,
            altText: true,
            order: true,
          },
        },
      },
    });

    if (!car) return null;

    const images = car.images.map((image) => this.normalizeImage(image));

    return {
      ...car,
      images,
      primaryImageUrl: images[0]?.url,
    };
  }

  async listImages(carId: string) {
    const images = await this.prisma.carImage.findMany({
      where: { carId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        s3KeyOriginal: true,
        altText: true,
        order: true,
      },
    });

    return images.map((image) => this.normalizeImage(image));
  }

  async addImage(carId: string, input: AddCarImageInput) {
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      select: { id: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    const s3KeyOriginal =
      input.s3KeyOriginal?.trim() ||
      input.key?.trim() ||
      input.s3Key?.trim();

    if (!s3KeyOriginal) {
      throw new BadRequestException('s3KeyOriginal is required');
    }

    const image = await this.prisma.carImage.create({
      data: {
        carId,
        s3KeyOriginal,
        altText: input.altText,
        order: input.order ?? 0,
      },
      select: {
        id: true,
        s3KeyOriginal: true,
        altText: true,
        order: true,
      },
    });

    return this.normalizeImage(image);
  }
}