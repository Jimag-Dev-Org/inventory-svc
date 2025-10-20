import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CarsService } from './cars.service.js';
import { ListCarsQuery } from './dto/query.dto.js';

@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  async list(@Query() q: ListCarsQuery) { return this.cars.list(q as any); }

  @Get(':id')
  async byId(@Param('id') id: string) { return this.cars.get(id); }

  @Get(':id/images')
  async images(@Param('id') id: string) { return this.cars.listImages(id); }

  @Post(':id/images')
  async addImage(
    @Param('id') id: string,
    @Body() body: { key: string; altText?: string; order?: number },
  ) {
    return this.cars.addImage(id, body.key, body.altText, body.order);
  }
}
