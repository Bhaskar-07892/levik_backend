import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { PublicSettingsResponseDto, SettingsResponseDto, UpdateSettingsRequestDto } from '../dto/settings.dto.js';
import { SettingsMapper } from '../mappers/settings.mapper.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('Admin · Settings')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get(): Promise<SettingsResponseDto> {
    return SettingsMapper.toDto(await this.settings.get());
  }

  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateSettingsRequestDto): Promise<SettingsResponseDto> {
    return SettingsMapper.toDto(await this.settings.update(actorFrom(user), body));
  }
}

@ApiTags('App · Settings')
@ApiBearerAuth()
@Roles('plumber', 'retailer', 'guest')
@Controller('app/settings')
export class AppSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get(): Promise<PublicSettingsResponseDto> {
    const s = await this.settings.get();
    return { programmeName: s.programmeName, maxDailyScansPerPlumber: s.maxDailyScansPerPlumber };
  }
}
