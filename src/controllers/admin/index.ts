import { getOverviewStats } from './getOverviewStats';
import { getUsers } from './getUsers';
import { updateUserRole } from './updateUserRole';
import { getStreams } from './getStreams';
import { updateStreamStatus } from './updateStreamStatus';
import { updateStreamVisibility } from './updateStreamVisibility';
import { deleteStream } from './deleteStream';
import { featureStream } from './featureStream';

export const AdminController = {
  getOverviewStats,
  getUsers,
  updateUserRole,
  getStreams,
  updateStreamStatus,
  updateStreamVisibility,
  deleteStream,
  featureStream,
};