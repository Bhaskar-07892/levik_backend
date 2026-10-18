import type { ProductCategory, SchemeStatus, SchemeTargetType, UserRole } from '../../../common/domain/enums.js';

export interface SchemeBo {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  startDate: Date;
  endDate: Date;
  eligibleCategories: ProductCategory[];
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  status: SchemeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemeInputBo {
  name: string;
  description: string;
  role: UserRole;
  startDate: Date;
  endDate: Date;
  eligibleCategories: ProductCategory[];
  targetValue: number;
  incentivePoints: number;
}

export interface SchemeSummaryBo {
  participants: number;
  achievers: number;
  averagePercent: number;
  bonusPointsIssued: number;
}

export interface SchemeWithSummaryBo extends SchemeBo {
  summary: SchemeSummaryBo;
}

export interface SchemeParticipantBo {
  userId: string;
  name: string;
  location: string;
  progress: number;
  percent: number;
  awarded: boolean;
}

/** How approving one scan/invoice would move the participant's live scheme progress. */
export interface SchemeImpactBo {
  schemeId: string;
  schemeName: string;
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  before: number;
  after: number;
  willAward: boolean;
  alreadyAwarded: boolean;
}

export interface MySchemeProgressBo extends SchemeBo {
  progress: number;
  percent: number;
  awarded: boolean;
}

export interface AwardedSchemeBo {
  id: string;
  name: string;
  incentivePoints: number;
}

export interface SchemeQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  status?: SchemeStatus;
  role?: UserRole;
}
