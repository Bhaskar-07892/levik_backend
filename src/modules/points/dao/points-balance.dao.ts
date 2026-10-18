import { ViewColumn, ViewEntity } from 'typeorm';
import type { UserRole } from '../../../common/domain/enums.js';

/** Read-only view: balances are always derived from the ledger, never stored. */
@ViewEntity({ name: 'points_balances', synchronize: false })
export class PointsBalanceDao {
  @ViewColumn({ name: 'user_id' })
  userId: string;

  @ViewColumn({ name: 'user_role' })
  userRole: UserRole;

  @ViewColumn()
  lifetime: number;

  @ViewColumn()
  redeemed: number;

  @ViewColumn()
  available: number;
}
