import { Body, Controller, Get, Header, Param, Post, Query, StreamableFile, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { CreateLabelBatchRequestDto, LabelBatchQueryDto, LabelSheetQueryDto } from '../dto/label.request.dto.js';
import { LabelBatchPageResponseDto, LabelBatchResponseDto, ProductUnitResponseDto } from '../dto/label.response.dto.js';
import { LabelMapper } from '../mappers/label.mapper.js';
import { LabelsService } from '../services/labels.service.js';

@ApiTags('Admin · QR labels')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminLabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Post('products/:productId/label-batches')
  async createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() body: CreateLabelBatchRequestDto,
  ): Promise<LabelBatchResponseDto> {
    return LabelMapper.batchToDto(await this.labels.createBatch(actorFrom(user), productId, body.quantity, body.note));
  }

  @Get('label-batches')
  async listBatches(@Query() query: LabelBatchQueryDto): Promise<LabelBatchPageResponseDto> {
    return toPage(await this.labels.listBatches(query), LabelMapper.batchToDto);
  }

  @Get('label-batches/:id')
  async getBatch(@Param('id') id: string): Promise<LabelBatchResponseDto> {
    return LabelMapper.batchToDto(await this.labels.getBatch(id));
  }

  /** Printable A4 sheet (24 labels per page). Use offset/limit to print large batches in parts. */
  @Get('label-batches/:id/labels.pdf')
  @ApiProduces('application/pdf')
  async sheet(@Param('id') id: string, @Query() query: LabelSheetQueryDto): Promise<StreamableFile> {
    const { filename, stream } = await this.labels.batchSheet(id, query.offset, query.limit);
    return new StreamableFile(stream, { type: 'application/pdf', disposition: `attachment; filename="${filename}"` });
  }

  /** Serial list with QR payloads, for external label printers. */
  @Get('label-batches/:id/labels.csv')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async csv(@Param('id') id: string): Promise<StreamableFile> {
    const { filename, csv } = await this.labels.batchCsv(id);
    return new StreamableFile(Buffer.from(csv), { type: 'text/csv; charset=utf-8', disposition: `attachment; filename="${filename}"` });
  }

  @Get('product-units/:serial')
  async unit(@Param('serial') serial: string): Promise<ProductUnitResponseDto> {
    return LabelMapper.unitToDto(await this.labels.getUnit(serial));
  }

  @Post('product-units/:serial/void')
  @HttpCode(HttpStatus.OK)
  async voidUnit(@CurrentUser() user: AuthenticatedUser, @Param('serial') serial: string, @Body() body: ReasonRequestDto): Promise<ProductUnitResponseDto> {
    return LabelMapper.unitToDto(await this.labels.voidUnit(actorFrom(user), serial, body.reason));
  }
}
