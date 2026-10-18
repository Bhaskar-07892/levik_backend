import type { RewardBo, RewardWithStatsBo } from '../bo/reward.bo.js';
import type { RewardDao } from '../dao/reward.dao.js';
import type { AppRewardResponseDto, RewardResponseDto } from '../dto/reward.response.dto.js';

export const RewardMapper = {
  toBo: (d: RewardDao): RewardBo => ({
    id: d.id,
    name: d.name,
    category: d.category,
    type: d.type,
    description: d.description,
    pointsRequired: d.pointsRequired,
    stock: d.stock,
    isActive: d.isActive,
    eligibleRoles: d.eligibleRoles,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }),
  toDto: (b: RewardWithStatsBo): RewardResponseDto => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }),
  toAppDto: (b: RewardBo, availablePoints: number): AppRewardResponseDto => ({
    id: b.id,
    name: b.name,
    category: b.category,
    type: b.type,
    description: b.description,
    pointsRequired: b.pointsRequired,
    inStock: b.stock > 0,
    pointsShort: Math.max(0, b.pointsRequired - availablePoints),
  }),
};
