import type { TicketCategory, TicketPriority, TicketStatus, UserRole } from '../../../common/domain/enums.js';

export interface TicketNoteBo {
  at: Date;
  byName: string;
  body: string;
}

export interface SupportTicketBo {
  id: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  subject: string;
  category: TicketCategory;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  notes: TicketNoteBo[];
}

export interface TicketQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  userId?: string;
}

export interface CreateTicketBo {
  subject: string;
  category: TicketCategory;
  description: string;
  priority: TicketPriority;
}
