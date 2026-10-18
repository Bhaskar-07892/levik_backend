/** One verification rule result shown to reviewers and enforced on approval. */
export interface CheckBo {
  label: string;
  passed: boolean;
  /** Approval is refused while any blocking check fails. */
  blocking: boolean;
  detail: string;
}

export const failedBlocking = (checks: CheckBo[]) => checks.filter((c) => c.blocking && !c.passed);
