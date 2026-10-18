import type { SettingsBo } from '../bo/settings.bo.js';
import type { SettingsDao } from '../dao/settings.dao.js';
import type { SettingsResponseDto } from '../dto/settings.dto.js';

export const SettingsMapper = {
  toBo: (d: SettingsDao): SettingsBo => ({
    programmeName: d.programmeName,
    retailerPointsPer100: d.retailerPointsPer100,
    lowStockThreshold: d.lowStockThreshold,
    notifications: d.notifications,
    maxDailyScansPerPlumber: d.maxDailyScansPerPlumber,
    updatedAt: d.updatedAt,
  }),
  toDto: (b: SettingsBo): SettingsResponseDto => ({ ...b, updatedAt: b.updatedAt.toISOString() }),
};
