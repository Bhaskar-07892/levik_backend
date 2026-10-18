import { Body, Controller, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import type { AuthenticatedUser, ParticipantRole } from '../../../common/interfaces/authenticated-user.interface.js';
import { CreateSchemeRequestDto, SchemeQueryDto, UpdateSchemeRequestDto } from '../dto/scheme.request.dto.js';
import {
  MySchemeProgressResponseDto,
  SchemePageResponseDto,
  SchemeParticipantResponseDto,
  SchemeResponseDto,
  SchemeWithSummaryResponseDto,
} from '../dto/scheme.response.dto.js';
import { SchemeMapper } from '../mappers/scheme.mapper.js';
import { SchemesService } from '../services/schemes.service.js';

@ApiTags('Admin · Schemes')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/schemes')
export class AdminSchemesController {
  constructor(private readonly schemes: SchemesService) {}

  @Get()
  async list(@Query() query: SchemeQueryDto): Promise<SchemePageResponseDto> {
    return toPage(await this.schemes.list(query), SchemeMapper.withSummaryToDto);
  }

  /** Counts per status for the tab badges. */
  @Get('status-counts')
  statusCounts(): Promise<Record<string, number>> {
    return this.schemes.statusCounts();
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<SchemeWithSummaryResponseDto> {
    return SchemeMapper.withSummaryToDto(await this.schemes.get(id));
  }

  @Get(':id/participants')
  async participants(@Param('id') id: string): Promise<SchemeParticipantResponseDto[]> {
    return (await this.schemes.participants(id)).map(SchemeMapper.participantToDto);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateSchemeRequestDto): Promise<SchemeResponseDto> {
    return SchemeMapper.toDto(await this.schemes.create(actorFrom(user), body));
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateSchemeRequestDto): Promise<SchemeResponseDto> {
    return SchemeMapper.toDto(await this.schemes.update(actorFrom(user), id, body));
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SchemeResponseDto> {
    return SchemeMapper.toDto(await this.schemes.activate(actorFrom(user), id));
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonRequestDto): Promise<SchemeResponseDto> {
    return SchemeMapper.toDto(await this.schemes.pause(actorFrom(user), id, body.reason));
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SchemeResponseDto> {
    return SchemeMapper.toDto(await this.schemes.complete(actorFrom(user), id));
  }
}

@ApiTags('App · Schemes')
@ApiBearerAuth()
@Roles('plumber', 'retailer')
@Controller('app/schemes')
export class AppSchemesController {
  constructor(private readonly schemes: SchemesService) {}

  /** Active and upcoming schemes for the signed-in participant, with their own progress. */
  @Get()
  async mine(@CurrentUser() user: AuthenticatedUser): Promise<MySchemeProgressResponseDto[]> {
    return (await this.schemes.myProgress(user.sub, user.role as ParticipantRole)).map(SchemeMapper.myProgressToDto);
  }
}
