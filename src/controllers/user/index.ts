import { getUserById } from './getUserById';
import { updateProfile } from './updateProfile';
import { updateAvatar } from './updateAvatar';
import { updateSettings } from './updateSettings';
import { searchUsers } from './searchUsers';
import { getTopUsers } from './getTopUsers';
import { toggleBlockUser } from './toggleBlockUser';
import { deleteAccount } from './deleteAccount';

export const UserController = {
  getUserById,
  updateProfile,
  updateAvatar,
  updateSettings,
  searchUsers,
  getTopUsers,
  toggleBlockUser,
  deleteAccount,
};