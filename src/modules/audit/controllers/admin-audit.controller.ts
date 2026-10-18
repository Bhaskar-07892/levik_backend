import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { AuditQueryDto } from '../dto/audit-query.dto.js';
import { AuditFilterOptionsResponseDto, AuditLogPageResponseDto } from '../dto/audit.response.dto.js';
import { AuditMapper } from '../mappers/audit.mapper.js';
import { AuditService } from '../services/audit.service.js';

@ApiTags('Admin · Audit logs')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: AuditQueryDto): Promise<AuditLogPageResponseDto> {
    const page = await this.audit.list({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      entityType: query.entityType,
      adminName: query.admin,
      from: query.from,
      to: query.to,
    });
    return toPage(page, AuditMapper.logToDto);
  }

  @Get('filter-options')
  filterOptions(): Promise<AuditFilterOptionsResponseDto> {
    return this.audit.filterOptions();
  }
}
