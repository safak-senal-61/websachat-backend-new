import { createReport } from './createReport';
import { getReports } from './getReports';
import { getReport } from './getReport';
import { assignReport } from './assignReport';
import { addReportNote } from './addReportNote';
import { resolveReport } from './resolveReport';
import { dismissReport } from './dismissReport';
import { appealReport } from './appealReport';

import { createBan } from './createBan';
import { getBans } from './getBans';
import { getBan } from './getBan';
import { extendBan } from './extendBan';
import { liftBan } from './liftBan';
import { appealBan } from './appealBan';
import { processAppeal } from './processAppeal';

import { getReportStats } from './getReportStats';
import { getBanStats } from './getBanStats';
import { getModeratorWorkload } from './getModeratorWorkload';
import { cleanupExpiredBans } from './cleanupExpiredBans';

export const ModerationController = {
  createReport,
  getReports,
  getReport,
  assignReport,
  addReportNote,
  resolveReport,
  dismissReport,
  appealReport,

  createBan,
  getBans,
  getBan,
  extendBan,
  liftBan,
  appealBan,
  processAppeal,

  getReportStats,
  getBanStats,
  getModeratorWorkload,
  cleanupExpiredBans,
};