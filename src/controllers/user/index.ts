import { getUserById } from './getUserById';
import { updateProfile } from './updateProfile';
import { updateAvatar } from './updateAvatar';
import { deleteAvatar } from './deleteAvatar';
import { updateSettings } from './updateSettings';
import { searchUsers } from './searchUsers';
import { getTopUsers } from './getTopUsers';
import { toggleBlockUser } from './toggleBlockUser';
import { deleteAccount } from './deleteAccount';
import { getVirtualBalance } from './getVirtualBalance';
import { getMyLevelProgress, addXp, getUserLevelProgressPublic, getUserLevelPublic } from './levels';

export const UserController = {
  getUserById,
  updateProfile,
  updateAvatar,
  deleteAvatar,
  updateSettings,
  searchUsers,
  getTopUsers,
  toggleBlockUser,
  deleteAccount,
  getVirtualBalance,
  getMyLevelProgress,
  addXp,
  getUserLevelProgressPublic,
  getUserLevelPublic,
};