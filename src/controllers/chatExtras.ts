import type { Response } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/config/database';

// List unique DIRECT chat partners with last message and unread count
export const listChatPartners = async (req: AuthRequest, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const qp = req.query as Record<string, unknown>;
  const toNumber = (v: unknown, fallback: number): number => {
    if (typeof v === 'string') return Number(v);
    if (Array.isArray(v) && typeof v[0] === 'string') return Number(v[0]);
    return fallback;
  };
  const page = toNumber(qp.page, 1);
  const limit = toNumber(qp.limit, 20);

  const [memberships, total] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: {
        userId: currentUserId,
        conversation: { is: { type: 'DIRECT' } },
      },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.conversationParticipant.count({ where: { userId: currentUserId, conversation: { is: { type: 'DIRECT' } } } }),
  ]);

  const items = await Promise.all(
    memberships.map(async (m) => {
      const convId = m.conversationId;

      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: convId },
        orderBy: { createdAt: 'desc' },
      });

      let unreadCount = 0;
      if (m.lastReadMessageId) {
        const lastRead = await prisma.message.findUnique({ where: { id: m.lastReadMessageId } });
        const afterDate = lastRead?.createdAt ?? m.joinedAt;
        unreadCount = await prisma.message.count({
          where: { conversationId: convId, createdAt: { gt: afterDate } },
        });
      } else {
        unreadCount = await prisma.message.count({ where: { conversationId: convId } });
      }

      const partner = m.conversation.participants.find((p) => p.userId !== currentUserId)?.user ?? null;

      return {
        partner,
        conversationId: convId,
        lastMessage,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      partners: items,
      pagination: { page, limit, total },
    },
  });
};
// Summaries for all conversations (DIRECT and GROUP) with last message and unread count
export const getConversationSummaries = async (req: AuthRequest, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const qp = req.query as Record<string, unknown>;
  const toNumber = (v: unknown, fallback: number): number => {
    if (typeof v === 'string') return Number(v);
    if (Array.isArray(v) && typeof v[0] === 'string') return Number(v[0]);
    return fallback;
  };
  const page = toNumber(qp.page, 1);
  const limit = toNumber(qp.limit, 20);

  const [memberships, total] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { userId: currentUserId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.conversationParticipant.count({ where: { userId: currentUserId } }),
  ]);

  const items = await Promise.all(
    memberships.map(async (m) => {
      const convId = m.conversationId;
      const conv = m.conversation;

      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: convId },
        orderBy: { createdAt: 'desc' },
      });

      let unreadCount = 0;
      if (m.lastReadMessageId) {
        const lastRead = await prisma.message.findUnique({ where: { id: m.lastReadMessageId } });
        const afterDate = lastRead?.createdAt ?? m.joinedAt;
        unreadCount = await prisma.message.count({
          where: { conversationId: convId, createdAt: { gt: afterDate } },
        });
      } else {
        unreadCount = await prisma.message.count({ where: { conversationId: convId } });
      }

      const directPartner = conv.type === 'DIRECT'
        ? conv.participants.find((p) => p.userId !== currentUserId)?.user ?? null
        : null;

      return {
        conversation: {
          id: conv.id,
          type: conv.type,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        },
        directPartner,
        lastMessage,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      summaries: items,
      pagination: { page, limit, total },
    },
  });
};

// Total unread count and optionally per-conversation breakdown
export const getUnreadCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const qp = req.query as Record<string, unknown>;
  const toBoolean = (v: unknown, fallback: boolean): boolean => {
    if (typeof v === 'string') return v === 'true';
    return fallback;
  };
  const perConversation = toBoolean(qp.perConversation, false);

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: currentUserId },
    select: { conversationId: true, lastReadMessageId: true, joinedAt: true },
  });

  let totalUnread = 0;
  const breakdown: Array<{ conversationId: string; unreadCount: number }> = [];

  for (const m of memberships) {
    const convId = m.conversationId;
    let unreadCount = 0;
    if (m.lastReadMessageId) {
      const lastRead = await prisma.message.findUnique({ where: { id: m.lastReadMessageId } });
      const afterDate = lastRead?.createdAt ?? m.joinedAt;
      unreadCount = await prisma.message.count({
        where: { conversationId: convId, createdAt: { gt: afterDate } },
      });
    } else {
      unreadCount = await prisma.message.count({ where: { conversationId: convId } });
    }
    totalUnread += unreadCount;
    if (perConversation) breakdown.push({ conversationId: convId, unreadCount });
  }

  res.status(200).json({ success: true, data: { totalUnread, breakdown: perConversation ? breakdown : undefined } });
};

// Mute a conversation (optionally until a given time)
export const muteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };
  const { muteUntil, durationMinutes } = req.body as { muteUntil?: string; durationMinutes?: number };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
  });
  if (!participant) {
    res.status(404).json({ success: false, message: 'Konuşmada katılımcı değilsiniz' });
    return;
  }

  let until: Date | null = null;
  if (typeof muteUntil === 'string' && muteUntil.trim().length > 0) {
    const parsed = new Date(muteUntil);
    if (!Number.isNaN(parsed.getTime())) until = parsed;
  } else if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes) && durationMinutes > 0) {
    until = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
    data: { muteUntil: until },
  });

  res.status(200).json({ success: true, message: 'Konuşma sessize alındı', data: { muteUntil: until } });
};

export const unmuteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
  });
  if (!participant) {
    res.status(404).json({ success: false, message: 'Konuşmada katılımcı değilsiniz' });
    return;
  }

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
    data: { muteUntil: null },
  });

  res.status(200).json({ success: true, message: 'Konuşma sessizden çıkarıldı' });
};

export const toggleConversationNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };
  const { enabled } = req.body as { enabled: boolean };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
  });
  if (!participant) {
    res.status(404).json({ success: false, message: 'Konuşmada katılımcı değilsiniz' });
    return;
  }

  const updated = await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
    data: { notificationsEnabled: !!enabled },
  });

  res.status(200).json({ success: true, data: { notificationsEnabled: updated.notificationsEnabled } });
};
