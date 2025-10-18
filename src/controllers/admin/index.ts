import { getOverviewStats } from './getOverviewStats';
import { getUsers } from './getUsers';
import { updateUserRole } from './updateUserRole';
import { getStreams } from './getStreams';
import { updateStreamStatus } from './updateStreamStatus';
import { updateStreamVisibility } from './updateStreamVisibility';
import { deleteStream } from './deleteStream';
import { featureStream } from './featureStream';

// Gift Management
import { 
  getGiftCatalog, 
  updateGiftCatalog, 
  addGift, 
  updateGift, 
  deleteGift,
  getGiftEconomy,
  updateGiftEconomy,
} from './giftManagement';

// Commission Tracking
import { 
  getCommissionSummary, 
  getCommissionReport, 
  getGiftStatistics 
} from './commissionTracking';

// Level Management
import { 
  getLevelSettings, 
  updateLevelSettings, 
  getUserLevelStats, 
  updateUserLevel, 
  calculateLevelFromXp 
} from './levelManagement';

export const AdminController = {
  getOverviewStats,
  getUsers,
  updateUserRole,
  getStreams,
  updateStreamStatus,
  updateStreamVisibility,
  deleteStream,
  featureStream,
  
  // Gift Management
  getGiftCatalog,
  updateGiftCatalog,
  addGift,
  updateGift,
  deleteGift,
  getGiftEconomy,
  updateGiftEconomy,
  
  // Commission Tracking
  getCommissionSummary,
  getCommissionReport,
  getGiftStatistics,
  
  // Level Management
  getLevelSettings,
  updateLevelSettings,
  getUserLevelStats,
  updateUserLevel,
  calculateLevelFromXp,
};