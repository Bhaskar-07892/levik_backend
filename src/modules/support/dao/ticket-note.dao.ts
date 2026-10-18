import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { SupportTicketDao } from './support-ticket.dao.js';

@Entity('ticket_notes')
export class TicketNoteDao {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column('text', { name: 'ticket_id' })
  ticketId: string;

  @ManyToOne('SupportTicketDao', 'notes', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: SupportTicketDao;

  @Column('timestamptz', { default: () => 'now()' })
  at: Date;

  @Column('text', { name: 'by_name' })
  byName: string;

  @Column('text')
  body: string;
}
