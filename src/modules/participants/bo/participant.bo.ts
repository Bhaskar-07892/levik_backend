import type { AccountStatus, UserRole } from '../../../common/domain/enums.js';

/** A plumber or a retailer, resolved by ID. */
export interface ParticipantBo {
  id: string;
  role: UserRole;
  name: string;
  location: string;
  accountStatus: AccountStatus;
  /** Plumber: KYC verified. Retailer: application approved. */
  verified: boolean;
}
