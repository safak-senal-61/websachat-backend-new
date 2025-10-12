// module: setupSocketHandlers
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

interface SocketUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: SocketUser;
}

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('JWT secret not configured'));
      }

      const decoded = jwt.verify(token, jwtSecret) as { userId: string; role?: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          isActive: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isBanned || !user.isActive) {
        return next(new Error('Authentication error: Account is blocked'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.user?.username} (${socket.userId})`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Live streaming events
    socket.on('join_stream', async (data: { streamId: string }) => {
      try {
        socket.join(`stream:${data.streamId}`);
        socket.to(`stream:${data.streamId}`).emit('user_joined', {
          userId: socket.userId,
          username: socket.user?.username,
          avatar: socket.user?.avatar,
        });
        
        logger.info(`User ${socket.user?.username} joined stream ${data.streamId}`);
      } catch (error) {
        logger.error('Error joining stream:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    socket.on('leave_stream', async (data: { streamId: string }) => {
      try {
        socket.leave(`stream:${data.streamId}`);
        socket.to(`stream:${data.streamId}`).emit('user_left', {
          userId: socket.userId,
          username: socket.user?.username,
        });
        
        logger.info(`User ${socket.user?.username} left stream ${data.streamId}`);
      } catch (error) {
        logger.error('Error leaving stream:', error);
      }
    });

    // Chat events
    socket.on('send_message', async (data: { streamId: string; message: string; type?: string }) => {
      try {
        const messageData = {
          id: Date.now().toString(),
          userId: socket.userId,
          username: socket.user?.username,
          avatar: socket.user?.avatar,
          message: data.message,
          type: data.type || 'text',
          timestamp: new Date(),
        };

        // Broadcast message to all users in the stream
        io.to(`stream:${data.streamId}`).emit('new_message', messageData);
        
        logger.info(`Message sent in stream ${data.streamId} by ${socket.user?.username}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Gift events
    socket.on('send_gift', async (data: { streamId: string; giftId: string; amount: number }) => {
      try {
        const giftData = {
          id: Date.now().toString(),
          senderId: socket.userId,
          senderUsername: socket.user?.username,
          senderAvatar: socket.user?.avatar,
          giftId: data.giftId,
          amount: data.amount,
          timestamp: new Date(),
        };

        // Broadcast gift to all users in the stream
        io.to(`stream:${data.streamId}`).emit('gift_received', giftData);
        
        logger.info(`Gift sent in stream ${data.streamId} by ${socket.user?.username}`);
      } catch (error) {
        logger.error('Error sending gift:', error);
        socket.emit('error', { message: 'Failed to send gift' });
      }
    });

    // Reaction events
    socket.on('send_reaction', async (data: { streamId: string; reaction: string }) => {
      try {
        const reactionData = {
          userId: socket.userId,
          username: socket.user?.username,
          reaction: data.reaction,
          timestamp: new Date(),
        };

        // Broadcast reaction to all users in the stream
        socket.to(`stream:${data.streamId}`).emit('reaction_received', reactionData);
        
        logger.info(`Reaction sent in stream ${data.streamId} by ${socket.user?.username}`);
      } catch (error) {
        logger.error('Error sending reaction:', error);
        socket.emit('error', { message: 'Failed to send reaction' });
      }
    });

    // Follow events
    socket.on('follow_user', async (data: { targetUserId: string }) => {
      try {
        // Notify the followed user
        socket.to(`user:${data.targetUserId}`).emit('new_follower', {
          followerId: socket.userId,
          followerUsername: socket.user?.username,
          followerAvatar: socket.user?.avatar,
        });
        
        logger.info(`User ${socket.user?.username} followed user ${data.targetUserId}`);
      } catch (error) {
        logger.error('Error following user:', error);
        socket.emit('error', { message: 'Failed to follow user' });
      }
    });

    // Conversations sockets
    socket.on('join_conversation', async (data: { conversationId: string }) => {
      try {
        socket.join(`conversation:${data.conversationId}`);
        socket.to(`conversation:${data.conversationId}`).emit('user_joined_conversation', { userId: socket.userId });
      } catch (error) {
        socket.emit('error', { message: 'Konuşmaya katılım başarısız' });
      }
    });

    socket.on('leave_conversation', async (data: { conversationId: string }) => {
      try {
        socket.leave(`conversation:${data.conversationId}`);
        socket.to(`conversation:${data.conversationId}`).emit('user_left_conversation', { userId: socket.userId });
      } catch (error) {
        socket.emit('error', { message: 'Konuşmadan çıkış başarısız' });
      }
    });

    socket.on('send_conversation_message', async (data: { conversationId: string; content: string; type?: string }) => {
      try {
        const payload = {
          id: Date.now().toString(),
          conversationId: data.conversationId,
          userId: socket.userId,
          username: socket.user?.username,
          avatar: socket.user?.avatar,
          content: data.content,
          type: data.type || 'TEXT',
          timestamp: new Date(),
        };
        io.to(`conversation:${data.conversationId}`).emit('new_conversation_message', payload);
      } catch (error) {
        socket.emit('error', { message: 'Mesaj gönderilemedi' });
      }
    });

    // Rooms sockets
    socket.on('join_room', async (data: { roomId: string }) => {
      try {
        socket.join(`room:${data.roomId}`);
        socket.to(`room:${data.roomId}`).emit('user_joined_room', { userId: socket.userId });
      } catch (error) {
        socket.emit('error', { message: 'Odaya katılım başarısız' });
      }
    });

    socket.on('leave_room', async (data: { roomId: string }) => {
      try {
        socket.leave(`room:${data.roomId}`);
        socket.to(`room:${data.roomId}`).emit('user_left_room', { userId: socket.userId });
      } catch (error) {
        socket.emit('error', { message: 'Odadan çıkış başarısız' });
      }
    });

    socket.on('send_room_message', async (data: { roomId: string; content: string; type?: string }) => {
      try {
        const payload = {
          id: Date.now().toString(),
          roomId: data.roomId,
          userId: socket.userId,
          username: socket.user?.username,
          avatar: socket.user?.avatar,
          content: data.content,
          type: data.type || 'TEXT',
          timestamp: new Date(),
        };
        io.to(`room:${data.roomId}`).emit('new_room_message', payload);
      } catch (error) {
        socket.emit('error', { message: 'Mesaj gönderilemedi' });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user?.username} (${socket.userId})`);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });
};