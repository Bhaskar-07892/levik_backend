import type { PointsSource, RelatedEntity, UserRole } from '../../../common/domain/enums.js';

export interface RelatedRefBo {
  type: RelatedEntity;
  id: string;
}

export interface PostPointsBo {
  userId: string;
  role: UserRole;
  source: PointsSource;
  /** Positive = credit, negative = debit. */
  amount: number;
  note: string;
  related?: RelatedRefBo;
}

export interface PointsTransactionBo {
  id: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  source: PointsSource;
  related: RelatedRefBo | null;
  credit: number;
  debit: number;
  createdAt: Date;
  status: 'Posted';
  note: string;
  createdBy: string;
}

export interface PointsBalanceBo {
  userId: string;
  userRole: UserRole;
  lifetime: number;
  redeemed: number;
  available: number;
}

export interface LedgerQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  source?: PointsSource;
  direction?: 'credit' | 'debit';
  userId?: string;
  relatedType?: RelatedEntity;
  relatedId?: string;
  from?: Date;
  to?: Date;
}
