import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { ParticipantBo } from '../bo/participant.bo.js';

interface ParticipantRow {
  id: string;
  role: 'plumber' | 'retailer';
  name: string;
  location: string;
  account_status: ParticipantBo['accountStatus'];
  verified: boolean;
}

/**
 * Read-only lookups across plumbers and retailers in one round trip. Kept separate from the plumber and
 * retailer modules so ledger/redemption/support code can resolve participants without circular imports.
 */
@Injectable()
export class ParticipantsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByIds(ids: string[], manager?: EntityManager): Promise<Map<string, ParticipantBo>> {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return new Map();
    const rows: ParticipantRow[] = await (manager ?? this.dataSource.manager).query(
      `select id, 'plumber' as role, name, city || ', ' || state as location, account_status,
              verification_status = 'Verified' as verified
         from plumbers where id = any($1)
       union all
       select id, 'retailer', shop_name, city || ', ' || state, account_status,
              verification_status = 'Approved'
         from retailers where id = any($1)`,
      [unique],
    );
    return new Map(
      rows.map((r) => [
        r.id,
        { id: r.id, role: r.role, name: r.name, location: r.location, accountStatus: r.account_status, verified: r.verified },
      ]),
    );
  }

  async findById(id: string, manager?: EntityManager): Promise<ParticipantBo | undefined> {
    return (await this.findByIds([id], manager)).get(id);
  }

  /** Plumber and/or retailer registered with this mobile ("+91 98290 11234"). */
  async findByMobile(mobileDisplay: string): Promise<ParticipantBo[]> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `select id from plumbers where mobile = $1 union all select id from retailers where mobile = $1`,
      [mobileDisplay],
    );
    const found = await this.findByIds(rows.map((r) => r.id));
    return [...found.values()];
  }
}
