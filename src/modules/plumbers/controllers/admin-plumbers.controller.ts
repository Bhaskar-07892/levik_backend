import { Body, Controller, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  PlumberQueryDto,
  SetAccountStatusRequestDto,
  SetPlumberVerificationRequestDto,
  UpdatePlumberRequestDto,
} from '../dto/plumber.request.dto.js';
import { PlumberDetailResponseDto, PlumberPageResponseDto, PlumberResponseDto } from '../dto/plumber.response.dto.js';
import { PlumberMapper } from '../mappers/plumber.mapper.js';
import { PlumbersService } from '../services/plumbers.service.js';

@ApiTags('Admin · Plumbers')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/plumbers')
export class AdminPlumbersController {
  constructor(private readonly plumbers: PlumbersService) {}

  @Get()
  async list(@Query() query: PlumberQueryDto): Promise<PlumberPageResponseDto> {
    return toPage(await this.plumbers.list(query), PlumberMapper.listItemToDto);
  }

  /** Distinct states for the filter dropdown. */
  @Get('states')
  states(): Promise<string[]> {
    return this.plumbers.states();
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<PlumberDetailResponseDto> {
    return PlumberMapper.detailToDto(await this.plumbers.detail(id));
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdatePlumberRequestDto): Promise<PlumberResponseDto> {
    return PlumberMapper.toDto(await this.plumbers.updateProfile(actorFrom(user), id, body));
  }

  @Post(':id/verification')
  @HttpCode(HttpStatus.OK)
  async setVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SetPlumberVerificationRequestDto,
  ): Promise<PlumberResponseDto> {
    return PlumberMapper.toDto(await this.plumbers.setVerification(actorFrom(user), id, body.status, body.note));
  }

  @Post(':id/account-status')
  @HttpCode(HttpStatus.OK)
  async setAccountStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SetAccountStatusRequestDto,
  ): Promise<PlumberResponseDto> {
    return PlumberMapper.toDto(await this.plumbers.setAccountStatus(actorFrom(user), id, body.status, body.reason));
  }
}
