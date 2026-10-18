import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  USER_ROLES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UserRole,
} from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';


export class TicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional() @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional() @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;

  @IsOptional() @IsString()
  userId?: string;
}

export class UpdateTicketRequestDto {
  @ApiProperty({ enum: TICKET_STATUSES })
  @IsIn(TICKET_STATUSES)
  status: TicketStatus;

  /** Internal note (admins only). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  note?: string;
}

export class CreateTicketRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(150)
  subject: string;

  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsIn(TICKET_CATEGORIES)
  category: TicketCategory;

  @Transform(trim) @IsString() @MinLength(5) @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional() @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}

export class TicketNoteResponseDto {
  at: string;
  by: string;
  text: string;
}

export class SupportTicketResponseDto {
  id: string;
  userId: string;
  @ApiProperty({ enum: USER_ROLES })
  userRole: UserRole;
  userName: string;
  subject: string;
  @ApiProperty({ enum: TICKET_CATEGORIES })
  category: TicketCategory;
  description: string;
  @ApiProperty({ enum: TICKET_PRIORITIES })
  priority: TicketPriority;
  @ApiProperty({ enum: TICKET_STATUSES })
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  notes: TicketNoteResponseDto[];
}

export class SupportTicketPageResponseDto {
  items: SupportTicketResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AppTicketResponseDto {
  id: string;
  subject: string;
  @ApiProperty({ enum: TICKET_CATEGORIES })
  category: TicketCategory;
  description: string;
  @ApiProperty({ enum: TICKET_PRIORITIES })
  priority: TicketPriority;
  @ApiProperty({ enum: TICKET_STATUSES })
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export class AppTicketPageResponseDto {
  items: AppTicketResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
