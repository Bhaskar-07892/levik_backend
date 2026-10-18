export class CheckResponseDto {
  label: string;
  passed: boolean;
  /** Approval is refused while any blocking check fails. */
  blocking: boolean;
  detail: string;
}

export class AwardedSchemeDto {
  id: string;
  name: string;
  incentivePoints: number;
}

export class ApprovalResultResponseDto {
  points: number;
  ledgerTxnId?: string;
  /** Scheme bonuses this approval unlocked (each paid once). */
  schemeAwards: AwardedSchemeDto[];
}
