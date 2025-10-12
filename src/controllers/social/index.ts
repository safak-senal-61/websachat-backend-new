import { followUser } from './followUser';
import { unfollowUser } from './unfollowUser';
import { getFollowers } from './getFollowers';
import { getFollowing } from './getFollowing';
import { blockUser } from './blockUser';
import { sendGift } from './sendGift';
import { getGiftHistory } from './getGiftHistory';
import { getTopGifters } from './getTopGifters';
import { getTopReceivers } from './getTopReceivers';
import { createComment } from './createComment';
import { getComments } from './getComments';
import { updateComment } from './updateComment';
import { deleteComment } from './deleteComment';
import { moderateComment } from './moderateComment';
import { reportComment } from './reportComment';
import { addReaction } from './addReaction';
import { removeReaction } from './removeReaction';
import { getReactions } from './getReactions';
import { getReactionStats } from './getReactionStats';
import { getLiveReactions } from './getLiveReactions';

export const SocialController = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  blockUser,
  sendGift,
  getGiftHistory,
  getTopGifters,
  getTopReceivers,
  createComment,
  getComments,
  updateComment,
  deleteComment,
  moderateComment,
  reportComment,
  addReaction,
  removeReaction,
  getReactions,
  getReactionStats,
  getLiveReactions,
};