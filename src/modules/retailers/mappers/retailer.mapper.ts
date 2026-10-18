import type { RetailerBo, RetailerDetailBo, RetailerListItemBo, StoreBo } from '../bo/retailer.bo.js';
import type { RetailerDao } from '../dao/retailer.dao.js';
import type {
  RetailerDetailResponseDto,
  RetailerListItemResponseDto,
  RetailerResponseDto,
  StoreResponseDto,
} from '../dto/retailer.response.dto.js';

export const RetailerMapper = {
  toBo: (d: RetailerDao): RetailerBo => ({
    id: d.id,
    shopName: d.shopName,
    ownerName: d.ownerName,
    mobile: d.mobile,
    email: d.email,
    address: d.address,
    city: d.city,
    state: d.state,
    gstin: d.gstin,
    distributor: d.distributor,
    registeredAt: d.registeredAt,
    verificationStatus: d.verificationStatus,
    accountStatus: d.accountStatus === 'Inactive' ? 'Suspended' : d.accountStatus,
    monthlyTarget: d.monthlyTarget,
    rejectionReason: d.rejectionReason,
    lastLoginAt: d.lastLoginAt,
  }),
  toStoreBo: (d: RetailerDao): StoreBo => ({ id: d.id, shopName: d.shopName, address: d.address, city: d.city, state: d.state, mobile: d.mobile }),
  achievement: (sales: number, target: number) => (target > 0 ? Math.round((sales / target) * 100) : 0),
  toDto: (b: RetailerBo): RetailerResponseDto => ({
    ...b,
    email: b.email ?? undefined,
    gstin: b.gstin ?? undefined,
    rejectionReason: b.rejectionReason ?? undefined,
    registeredAt: b.registeredAt.toISOString(),
    lastLoginAt: b.lastLoginAt?.toISOString(),
  }),
  listItemToDto: (b: RetailerListItemBo): RetailerListItemResponseDto => ({
    ...RetailerMapper.toDto(b),
    sales30d: b.sales30d,
    achievementPct: b.achievementPct,
    availablePoints: b.availablePoints,
  }),
  detailToDto: (b: RetailerDetailBo): RetailerDetailResponseDto => ({
    ...RetailerMapper.toDto(b),
    sales30d: b.sales30d,
    achievementPct: b.achievementPct,
    points: b.points,
  }),
  storeToDto: (b: StoreBo): StoreResponseDto => ({ ...b }),
};
