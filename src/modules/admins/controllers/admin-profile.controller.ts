import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFrom } from '../../../common/bo/actor.bo.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { AdminProfileResponseDto, UpdateAdminProfileRequestDto } from '../dto/admin.dto.js';
import { AdminMapper } from '../mappers/admin.mapper.js';
import { AdminsService } from '../services/admins.service.js';

@ApiTags('Admin · Profile')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/me')
export class AdminProfileController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AdminProfileResponseDto> {
    return AdminMapper.toDto(await this.admins.profile(user.sub));
  }

  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateAdminProfileRequestDto): Promise<AdminProfileResponseDto> {
    return AdminMapper.toDto(await this.admins.rename(actorFrom(user), user.sub, body.name));
  }
}
