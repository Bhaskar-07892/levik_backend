import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ProductsService } from '../../products/services/products.service.js';
import { ResolveLabelQueryDto } from '../dto/label.request.dto.js';
import { LabelVerificationResponseDto, ResolvedLabelResponseDto } from '../dto/label.response.dto.js';
import { LabelsService } from '../services/labels.service.js';

@ApiTags('App · QR labels')
@ApiBearerAuth()
@Roles('plumber')
@Controller('app/labels')
export class AppLabelsController {
  constructor(
    private readonly labels: LabelsService,
    private readonly products: ProductsService,
  ) {}

  /** Called right after the camera reads a QR: shows the product and points before submitting the scan. */
  @Get('resolve')
  async resolve(@Query() query: ResolveLabelQueryDto): Promise<ResolvedLabelResponseDto> {
    const resolved = await this.labels.resolve(query.code);
    if (!resolved.unit) return { serial: resolved.serial, signatureValid: resolved.signatureValid, status: 'Unknown' };
    const product = await this.products.get(resolved.unit.productId);
    return {
      serial: resolved.serial,
      signatureValid: resolved.signatureValid,
      status: resolved.unit.status,
      productId: product.id,
      productName: product.name,
      modelCode: product.modelCode,
      imageUrl: product.imageUrl ?? undefined,
      scanPoints: product.rewardEligible ? product.plumberPoints : 0,
    };
  }
}

@ApiTags('Public · Label verification')
@Controller('public/labels')
export class PublicLabelsController {
  constructor(private readonly labels: LabelsService) {}

  /** Opened when a customer scans a label with a normal camera: is this a genuine Levik product? */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('verify')
  verify(@Query() query: ResolveLabelQueryDto): Promise<LabelVerificationResponseDto> {
    return this.labels.verifyPublic(query.code);
  }
}
