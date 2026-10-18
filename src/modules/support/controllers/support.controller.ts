import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { PaginationQueryDto, toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser, ParticipantRole } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  AppTicketPageResponseDto,
  AppTicketResponseDto,
  CreateTicketRequestDto,
  SupportTicketPageResponseDto,
  SupportTicketResponseDto,
  TicketQueryDto,
  UpdateTicketRequestDto,
} from '../dto/support.dto.js';
import { SupportMapper } from '../mappers/support.mapper.js';
import { SupportService } from '../services/support.service.js';

@ApiTags('Admin · Support')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/support-tickets')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  async list(@Query() query: TicketQueryDto): Promise<SupportTicketPageResponseDto> {
    return toPage(await this.support.list(query), SupportMapper.toDto);
  }

  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.support.statusCounts();
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<SupportTicketResponseDto> {
    return SupportMapper.toDto(await this.support.get(id));
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateTicketRequestDto): Promise<SupportTicketResponseDto> {
    return SupportMapper.toDto(await this.support.update(actorFrom(user), id, body.status, body.note));
  }
}

@ApiTags('App · Support')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/support-tickets')
export class AppSupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTicketRequestDto): Promise<AppTicketResponseDto> {
    return SupportMapper.toAppDto(await this.support.create(user.sub, user.role as ParticipantRole, { ...body, priority: body.priority ?? 'Medium' }));
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto): Promise<AppTicketPageResponseDto> {
    return toPage(await this.support.list({ ...query, userId: user.sub }), SupportMapper.toAppDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<AppTicketResponseDto> {
    return SupportMapper.toAppDto(await this.support.get(id, user.sub));
  }
}
