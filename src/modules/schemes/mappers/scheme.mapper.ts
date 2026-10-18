import type { MySchemeProgressBo, SchemeBo, SchemeImpactBo, SchemeParticipantBo, SchemeWithSummaryBo } from '../bo/scheme.bo.js';
import type { SchemeDao } from '../dao/scheme.dao.js';
import type {
  MySchemeProgressResponseDto,
  SchemeImpactResponseDto,
  SchemeParticipantResponseDto,
  SchemeResponseDto,
  SchemeWithSummaryResponseDto,
} from '../dto/scheme.response.dto.js';

export const SchemeMapper = {
  toBo: (d: SchemeDao): SchemeBo => ({
    id: d.id,
    name: d.name,
    description: d.description,
    role: d.role,
    startDate: d.startDate,
    endDate: d.endDate,
    eligibleCategories: d.eligibleCategories,
    targetType: d.targetType,
    targetValue: d.targetValue,
    incentivePoints: d.incentivePoints,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }),
  percent: (progress: number, target: number) => Math.min(100, Math.round((progress / target) * 100)),
  toDto: (b: SchemeBo): SchemeResponseDto => ({
    ...b,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }),
  withSummaryToDto: (b: SchemeWithSummaryBo): SchemeWithSummaryResponseDto => ({ ...SchemeMapper.toDto(b), summary: b.summary }),
  participantToDto: (b: SchemeParticipantBo): SchemeParticipantResponseDto => ({ ...b }),
  impactToDto: (b: SchemeImpactBo): SchemeImpactResponseDto => ({ ...b }),
  myProgressToDto: (b: MySchemeProgressBo): MySchemeProgressResponseDto => ({
    ...SchemeMapper.toDto(b),
    progress: b.progress,
    percent: b.percent,
    awarded: b.awarded,
  }),
};
