import { Body, Controller, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import {
  RetailerQueryDto,
  ReviewRetailerRequestDto,
  SetRetailerAccountStatusRequestDto,
  UpdateRetailerRequestDto,
} from '../dto/retailer.request.dto.js';
import { RetailerDetailResponseDto, RetailerPageResponseDto, RetailerResponseDto } from '../dto/retailer.response.dto.js';
import { RetailerMapper } from '../mappers/retailer.mapper.js';
import { RetailersService } from '../services/retailers.service.js';

@ApiTags('Admin · Retailers')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/retailers')
export class AdminRetailersController {
  constructor(private readonly retailers: RetailersService) {}

  @Get()
  async list(@Query() query: RetailerQueryDto): Promise<RetailerPageResponseDto> {
    return toPage(await this.retailers.list(query), RetailerMapper.listItemToDto);
  }

  @Get('states')
  states(): Promise<string[]> {
    return this.retailers.states();
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<RetailerDetailResponseDto> {
    return RetailerMapper.detailToDto(await this.retailers.detail(id));
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateRetailerRequestDto): Promise<RetailerResponseDto> {
    return RetailerMapper.toDto(await this.retailers.updateProfile(actorFrom(user), id, body));
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async review(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReviewRetailerRequestDto): Promise<RetailerResponseDto> {
    return RetailerMapper.toDto(await this.retailers.review(actorFrom(user), id, body.decision, body.reason));
  }

  @Post(':id/account-status')
  @HttpCode(HttpStatus.OK)
  async setAccountStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SetRetailerAccountStatusRequestDto,
  ): Promise<RetailerResponseDto> {
    return RetailerMapper.toDto(await this.retailers.setAccountStatus(actorFrom(user), id, body.status, body.reason));
  }
}
