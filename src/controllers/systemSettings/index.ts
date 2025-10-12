import getSettings from './getSettings';
import getSetting from './getSetting';
import createSetting from './createSetting';
import updateSetting from './updateSetting';
import bulkUpdateSettings from './bulkUpdateSettings';
import deleteSetting from './deleteSetting';
import resetSettings from './resetSettings';
import exportSettings from './exportSettings';
import importSettings from './importSettings';
import rollbackSetting from './rollbackSetting';
import validateSettingValue from './validateSettingValue';
import getSettingHistory from './getSettingHistory';
import getSettingsByCategory from './getSettingsByCategory';
import getPublicSettings from './getPublicSettings';
import updateNotificationSettings from './updateNotificationSettings';
import updatePrivacySettings from './updatePrivacySettings';
import updateSupportSettings from './updateSupportSettings';

export const SystemSettingsController = {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  bulkUpdateSettings,
  deleteSetting,
  resetSettings,
  exportSettings,
  importSettings,
  rollbackSetting,
  validateSettingValue,
  getSettingHistory,
  getSettingsByCategory,
  getPublicSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  updateSupportSettings
};