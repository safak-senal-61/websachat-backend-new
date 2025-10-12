import { sendMessage } from '@/controllers/chat/sendMessage';
import { getMessages } from '@/controllers/chat/getMessages';
import { updateMessage } from '@/controllers/chat/updateMessage';
import { deleteMessage } from '@/controllers/chat/deleteMessage';

export const ChatController = {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
};