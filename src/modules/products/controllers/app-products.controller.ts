import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { AppProductQueryDto } from '../dto/product.request.dto.js';
import { AppProductPageResponseDto, AppProductResponseDto } from '../dto/product.response.dto.js';
import { ProductMapper } from '../mappers/product.mapper.js';
import { ProductsService } from '../services/products.service.js';

@ApiTags('App · Products')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/products')
export class AppProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  async list(@Query() query: AppProductQueryDto): Promise<AppProductPageResponseDto> {
    const page = await this.products.list({ page: query.page, pageSize: query.pageSize, search: query.search, category: query.category, isActive: true });
    return toPage(page, ProductMapper.toAppDto);
  }

  @Get('barcode/:barcode')
  async byBarcode(@Param('barcode') barcode: string): Promise<AppProductResponseDto> {
    return ProductMapper.toAppDto(await this.products.findByBarcode(barcode));
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<AppProductResponseDto> {
    return ProductMapper.toAppDto(await this.products.getActive(id));
  }
}
