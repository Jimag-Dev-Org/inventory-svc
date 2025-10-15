import { Controller, Get, Query } from '@nestjs/common';

@Controller('cars')
export class CarsController {
  @Get()
  list(@Query('make') make?: string) {
    const data = [
      { id: '1', make: 'Toyota', model: 'Camry', year: 2019, price: 16500, mileage: 42000 },
      { id: '2', make: 'Honda', model: 'Civic', year: 2018, price: 14900, mileage: 51000 }
    ];
    return make ? data.filter(d => d.make.toLowerCase() === make.toLowerCase()) : data;
  }
}