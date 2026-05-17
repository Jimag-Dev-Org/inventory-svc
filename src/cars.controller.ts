import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CarsService } from './cars.service.js';
import { ListCarsQuery } from './dto/query.dto.js';

type AddCarImageBody = {
  // Preferred field going forward because it matches the Prisma model
  s3KeyOriginal?: string;

  // Backward-compatible aliases so older UI/admin code still works
  key?: string;
  s3Key?: string;

  altText?: string;
  order?: number;
};

@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  async list(@Query() q: ListCarsQuery) {
    return this.cars.list(q as any);
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const car = await this.cars.get(id);

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return car;
  }

  @Get(':id/images')
  async images(@Param('id') id: string) {
    return this.cars.listImages(id);
  }

  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body() body: AddCarImageBody,
  ) {
    return this.cars.addImage(id, body);
  }
}