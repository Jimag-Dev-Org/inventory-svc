import { IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

// Helper: parse optional numbers
const toNum = () => Transform(({ value }) => (value === undefined ? undefined : Number(value)));

export class ListCarsQuery {
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;

  @IsOptional() @toNum() @IsInt() yearMin?: number;
  @IsOptional() @toNum() @IsInt() yearMax?: number;

  // Accept dollars in query; we convert to cents in service
  @IsOptional() @toNum() @IsInt() priceMin?: number;
  @IsOptional() @toNum() @IsInt() priceMax?: number;

  @IsOptional() @toNum() @IsInt() mileageMax?: number;

  @IsOptional() @IsIn(['newest','price_asc','price_desc','mileage_asc'])
  sort: 'newest'|'price_asc'|'price_desc'|'mileage_asc' = 'newest';

  @IsOptional() @toNum() @IsInt() @Min(1) page: number = 1;
  @IsOptional() @toNum() @IsInt() @Min(1) @Max(100) pageSize: number = 12;
}
