import type { AdminBo } from '../bo/admin.bo.js';
import type { AdminDao } from '../dao/admin.dao.js';
import type { AdminProfileResponseDto } from '../dto/admin.dto.js';

export const AdminMapper = {
  toBo: (d: AdminDao): AdminBo => ({
    id: d.id,
    name: d.name,
    email: d.email,
    isActive: d.isActive,
    lastLoginAt: d.lastLoginAt,
    createdAt: d.createdAt,
  }),
  toDto: (b: AdminBo): AdminProfileResponseDto => ({
    id: b.id,
    name: b.name,
    email: b.email,
    role: 'Programme Administrator',
    lastLoginAt: b.lastLoginAt?.toISOString(),
  }),
};
