import { Controller, Get, Param, Query } from '@nestjs/common';
import { CarsService } from './cars.service.js';
import { ListCarsQuery } from './dto/query.dto.js';

@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  async list(@Query() q: ListCarsQuery) {
    return this.cars.list(q);
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    return this.cars.get(id);
  }
}
