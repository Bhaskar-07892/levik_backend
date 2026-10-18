import type { SupportTicketBo } from '../bo/support.bo.js';
import type { SupportTicketDao } from '../dao/support-ticket.dao.js';
import type { AppTicketResponseDto, SupportTicketResponseDto } from '../dto/support.dto.js';

export const SupportMapper = {
  toBo: (d: SupportTicketDao, userName?: string): SupportTicketBo => ({
    id: d.id,
    userId: d.userId,
    userRole: d.userRole,
    userName: userName ?? d.userId,
    subject: d.subject,
    category: d.category,
    description: d.description,
    priority: d.priority,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    notes: (d.notes ?? []).map((n) => ({ at: n.at, byName: n.byName, body: n.body })),
  }),
  toDto: (b: SupportTicketBo): SupportTicketResponseDto => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    notes: b.notes.map((n) => ({ at: n.at.toISOString(), by: n.byName, text: n.body })),
  }),
  /** Internal notes are admin-only. */
  toAppDto: (b: SupportTicketBo): AppTicketResponseDto => ({
    id: b.id,
    subject: b.subject,
    category: b.category,
    description: b.description,
    priority: b.priority,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }),
};
