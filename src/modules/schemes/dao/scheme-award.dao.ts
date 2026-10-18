import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('scheme_awards')
export class SchemeAwardDao {
  @PrimaryColumn('text', { name: 'scheme_id' })
  schemeId: string;

  @PrimaryColumn('text', { name: 'user_id' })
  userId: string;

  @Column('timestamptz', { name: 'awarded_at', default: () => 'now()' })
  awardedAt: Date;

  @Column('text', { name: 'ledger_txn_id', nullable: true })
  ledgerTxnId: string | null;
}
