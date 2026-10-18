import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { toPage } from '../../../common/dto/pagination.dto.js';
import { toCsv } from '../../../common/utils/csv.util.js';
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

  /** All entries matching the filters (newest first, max 10,000) as CSV. Pagination params are ignored. */
  @Get('export.csv')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="levik-audit-log.csv"')
  async exportCsv(@Query() query: AuditQueryDto): Promise<string> {
    const rows = await this.audit.exportRows({
      search: query.search,
      entityType: query.entityType,
      adminName: query.admin,
      from: query.from,
      to: query.to,
    });
    return toCsv(
      rows.map((r) => {
        const log = AuditMapper.logToDto(r);
        return { timestamp: log.at, admin: log.admin, action: log.action, entity: log.entityType, reference: log.entityId, summary: log.summary };
      }),
    );
  }

  @Get('filter-options')
  filterOptions(): Promise<AuditFilterOptionsResponseDto> {
    return this.audit.filterOptions();
  }
}
