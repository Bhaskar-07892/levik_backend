import { Injectable } from '@nestjs/common';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { TicketStatus, UserRole } from '../../../common/domain/enums.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository.js';
import type { CreateTicketBo, SupportTicketBo, TicketQueryBo } from '../bo/support.bo.js';
import { SupportMapper } from '../mappers/support.mapper.js';
import { SupportRepository } from '../repositories/support.repository.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly tickets: SupportRepository,
    private readonly participants: ParticipantsRepository,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: TicketQueryBo): Promise<Page<SupportTicketBo>> {
    const page = await this.tickets.findPage(query);
    const names = await this.participants.findByIds(page.items.map((t) => t.userId));
    return { ...page, items: page.items.map((t) => SupportMapper.toBo(t, names.get(t.userId)?.name)) };
  }

  statusCounts(): Promise<Record<string, number>> {
    return this.tickets.statusCounts();
  }

  async get(id: string, ownerId?: string): Promise<SupportTicketBo> {
    const ticket = await this.tickets.findWithNotes(id);
    if (!ticket || (ownerId && ticket.userId !== ownerId)) throw AppException.notFound('Ticket', id);
    const participant = await this.participants.findById(ticket.userId);
    return SupportMapper.toBo(ticket, participant?.name);
  }

  async update(actor: ActorBo, id: string, status: TicketStatus, note?: string): Promise<SupportTicketBo> {
    await this.tx.run(async (manager) => {
      const ticket = await this.tickets.findByIdForUpdate(id, manager);
      if (!ticket) throw AppException.notFound('Ticket', id);
      const trimmed = note?.trim();
      if (ticket.status === status && !trimmed) throw AppException.invalidState('Change the status or add a note.');
      if (trimmed) await this.tickets.addNote(id, actor.name, trimmed, manager);
      await this.tickets.setStatus(id, status, manager);
      await this.audit.record(
        actor,
        { action: ticket.status !== status ? `Ticket ${status.toLowerCase()}` : 'Ticket note added', entityType: 'Support', entityId: id, summary: trimmed ?? `${ticket.subject} → ${status}` },
        manager,
      );
    });
    return this.get(id);
  }

  async create(userId: string, role: UserRole, input: CreateTicketBo): Promise<SupportTicketBo> {
    const id = await this.tickets.insert({ userId, userRole: role, ...input });
    return this.get(id, userId);
  }
}
