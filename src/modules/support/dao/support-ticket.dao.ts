import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
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
import { TicketNoteDao } from './ticket-note.dao.js';

@Entity('support_tickets')
export class SupportTicketDao {
  @PrimaryColumn('text', { default: () => `'TKT-' || nextval('ticket_seq')` })
  id: string;

  @Column('text', { name: 'user_id' })
  userId: string;

  @Column({ name: 'user_role', type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  userRole: UserRole;

  @Column('text')
  subject: string;

  @Column({ type: 'enum', enum: TICKET_CATEGORIES, enumName: 'ticket_category' })
  category: TicketCategory;

  @Column('text', { default: '' })
  description: string;

  @Column({ type: 'enum', enum: TICKET_PRIORITIES, enumName: 'ticket_priority', default: 'Medium' })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TICKET_STATUSES, enumName: 'ticket_status', default: 'Open' })
  status: TicketStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TicketNoteDao, (note) => note.ticket)
  notes?: TicketNoteDao[];
}
