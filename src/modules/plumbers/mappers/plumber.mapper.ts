import type { PlumberBo, PlumberDetailBo, PlumberListItemBo } from '../bo/plumber.bo.js';
import type { PlumberDao } from '../dao/plumber.dao.js';
import type { PlumberDetailResponseDto, PlumberListItemResponseDto, PlumberResponseDto } from '../dto/plumber.response.dto.js';

export const PlumberMapper = {
  toBo: (d: PlumberDao): PlumberBo => ({
    id: d.id,
    name: d.name,
    mobile: d.mobile,
    email: d.email,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    registeredAt: d.registeredAt,
    verificationStatus: d.verificationStatus,
    accountStatus: d.accountStatus,
    aadhaarMasked: d.aadhaarMasked,
    experienceYears: d.experienceYears,
    specialization: d.specialization,
    preferredRetailer: d.preferredRetailer ? { id: d.preferredRetailer.id, shopName: d.preferredRetailer.shopName } : null,
    verificationNote: d.verificationNote,
    lastLoginAt: d.lastLoginAt,
  }),
  toDto: (b: PlumberBo): PlumberResponseDto => ({
    ...b,
    email: b.email ?? undefined,
    aadhaarMasked: b.aadhaarMasked ?? undefined,
    preferredRetailer: b.preferredRetailer ?? undefined,
    verificationNote: b.verificationNote ?? undefined,
    registeredAt: b.registeredAt.toISOString(),
    lastLoginAt: b.lastLoginAt?.toISOString(),
  }),
  listItemToDto: (b: PlumberListItemBo): PlumberListItemResponseDto => ({
    ...PlumberMapper.toDto(b),
    lifetimePoints: b.lifetimePoints,
    availablePoints: b.availablePoints,
  }),
  detailToDto: (b: PlumberDetailBo): PlumberDetailResponseDto => ({
    ...PlumberMapper.toDto(b),
    points: b.points,
    scanCounts: b.scanCounts,
  }),
};
