import type { NotificationPreferences } from '../dao/settings.dao.js';

export interface SettingsBo {
  programmeName: string;
  retailerPointsPer100: number;
  lowStockThreshold: number;
  notifications: NotificationPreferences;
  maxDailyScansPerPlumber: number;
  updatedAt: Date;
}

export type SettingsUpdateBo = Partial<Omit<SettingsBo, 'updatedAt' | 'notifications'>> & {
  notifications?: Partial<NotificationPreferences>;
};
