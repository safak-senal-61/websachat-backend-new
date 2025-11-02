import type { Response } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/config/database';
import type { Prisma, $Enums, Conversation } from '@/generated/prisma';

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, title, participantIds, metadata } = req.body as {
    type: 'DIRECT' | 'GROUP';
    title?: string | null;
    participantIds: string[];
    metadata?: Record<string, unknown>;
  };

  const creatorId = req.user?.id;
  if (!creatorId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Ensure creator is included
  const uniqueParticipantIds = Array.from(new Set([...participantIds, creatorId]));

  // For DIRECT, enforce exactly 2 participants
  if (type === 'DIRECT' && uniqueParticipantIds.length !== 2) {
    res.status(400).json({ success: false, message: 'DIRECT konuşma için tam olarak 2 katılımcı gerekli' });
    return;
  }

  const conversation = await prisma.conversation.create({
    data: {
      type,
      title: title ?? null,
      creatorId,
      // metadata: sadece varsa ekle (exactOptionalPropertyTypes ile uyumlu)
      ...(metadata ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
      participants: {
        create: uniqueParticipantIds.map((userId) => ({
          userId,
          role: userId === creatorId ? 'OWNER' : 'MEMBER',
        })),
      },
    },
  });

  res.status(201).json({ success: true, data: { conversation } });
};

export const addParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };
  const { userId, role } = req.body as { userId: string; role: 'MEMBER' | 'ADMIN' | 'OWNER' };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { participants: true } });
  if (!conv) {
    res.status(404).json({ success: false, message: 'Konuşma bulunamadı' });
    return;
  }

  // Only creator or OWNER/ADMIN can add
  const me = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: currentUserId },
  });
  if (!me || (me.role !== 'OWNER' && me.role !== 'ADMIN' && conv.creatorId !== currentUserId)) {
    res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    return;
  }

  // Prevent duplicates
  const existing = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (existing) {
    res.status(409).json({ success: false, message: 'Kullanıcı zaten katılımcı' });
    return;
  }

  const participant = await prisma.conversationParticipant.create({
    data: { conversationId, userId, role },
  });

  // Bildirim: data'yı JSON olarak cast et
  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title: 'Konuşmaya davet',
      message: 'Bir konuşmaya davet edildiniz',
      data: ({ conversationId } as unknown as Prisma.InputJsonValue),
    },
  });

  res.status(201).json({ success: true, data: { participant } });
};

export const removeParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId, userId } = req.params as { conversationId: string; userId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    res.status(404).json({ success: false, message: 'Konuşma bulunamadı' });
    return;
  }

  // Only creator or OWNER/ADMIN can remove
  const me = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: currentUserId },
  });
  if (!me || (me.role !== 'OWNER' && me.role !== 'ADMIN' && conv.creatorId !== currentUserId)) {
    res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    return;
  }

  await prisma.conversationParticipant.delete({
    where: { conversationId_userId: { conversationId, userId } },
  });

  res.status(200).json({ success: true, message: 'Katılımcı kaldırıldı' });
};

export const listConversations = async (req: AuthRequest, res: Response): Promise<void> => {
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

  const [participants, total] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { userId: currentUserId },
      include: { conversation: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { joinedAt: 'desc' },
    }),
    prisma.conversationParticipant.count({ where: { userId: currentUserId } }),
  ]);

  const items = await Promise.all(
    participants.map(async (p) => {
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: p.conversationId },
        orderBy: { createdAt: 'desc' },
      });

      let unreadCount = 0;
      if (p.lastReadMessageId) {
        const lastRead = await prisma.message.findUnique({ where: { id: p.lastReadMessageId } });
        const afterDate = lastRead?.createdAt ?? p.joinedAt;
        unreadCount = await prisma.message.count({
          where: { conversationId: p.conversationId, createdAt: { gt: afterDate } },
        });
      } else {
        unreadCount = await prisma.message.count({ where: { conversationId: p.conversationId } });
      }

      return {
        conversation: p.conversation,
        lastMessage,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      conversations: items,
      pagination: { page, limit, total },
    },
  });
};

export const markConversationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };
  const { lastReadMessageId } = req.body as { lastReadMessageId: string };

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
    data: { lastReadMessageId },
  });

  res.status(200).json({ success: true, message: 'Okundu olarak işaretlendi' });
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };
  const { content, type, metadata, attachments } = req.body as {
    content?: string | null;
    type: $Enums.MessageType; // TEXT | IMAGE | VIDEO | STICKER | GIF | SYSTEM | EMOJI
    metadata?: Record<string, unknown>;
    attachments?: Record<string, unknown>;
  };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
  });
  if (!participant) {
    res.status(403).json({ success: false, message: 'Konuşmaya üye değilsiniz' });
    return;
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: currentUserId,
      content: content ?? null,
      type,
      // metadata / attachments: sadece varsa ekle (undefined set etmeyelim)
      ...(metadata ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
      ...(attachments ? { attachments: attachments as unknown as Prisma.InputJsonValue } : {}),
      isEdited: false,
      // Json[] bekleniyor: doğru tür kullanımı
      editHistory: [] as Prisma.InputJsonValue[],
      isDeleted: false,
    },
  });

  // Mentions -> notifications
  const mentionedUsernames = (content ? content.match(/@([a-zA-Z0-9_]+)/g) : null)?.map((m) => m.slice(1).toLowerCase()) ?? [];
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: mentionedUsers.map((u) => ({
        userId: u.id,
        type: 'MENTION',
        title: 'Bahsedildiniz',
        message: 'Bir mesajda sizden bahsedildi',
        data: ({ conversationId, messageId: message.id } as unknown as Prisma.InputJsonValue),
      })),
    });
  }

  res.status(201).json({ success: true, data: { message } });
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params as { conversationId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // must be member
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUserId } },
  });
  if (!participant) {
    res.status(403).json({ success: false, message: 'Konuşmaya üye değilsiniz' });
    return;
  }

  const qp = req.query as Record<string, unknown>;
  const toNumber = (v: unknown, fallback: number): number => {
    if (typeof v === 'string') return Number(v);
    if (Array.isArray(v) && typeof v[0] === 'string') return Number(v[0]);
    return fallback;
  };
  const toBoolean = (v: unknown, fallback: boolean): boolean => {
    if (typeof v === 'string') return v === 'true';
    return fallback;
  };
  const page = toNumber(qp.page, 1);
  const limit = toNumber(qp.limit, 50);
  const sortBy = typeof qp.sortBy === 'string' && qp.sortBy === 'oldest' ? 'oldest' : 'newest';
  const includeDeleted = toBoolean(qp.includeDeleted, false);
  const typeStr = typeof qp.type === 'string' ? qp.type : undefined;

  let where: Prisma.MessageWhereInput = { conversationId };
  if (!includeDeleted) where.isDeleted = false;

  const allowedTypes: ReadonlyArray<$Enums.MessageType> = [
    'TEXT', 'EMOJI', 'STICKER', 'GIF', 'IMAGE', 'VIDEO', 'SYSTEM',
  ];
  if (typeStr && allowedTypes.includes(typeStr as $Enums.MessageType)) {
    where.type = typeStr as $Enums.MessageType;
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: sortBy === 'newest' ? 'desc' : 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      messages,
      pagination: { page, limit, total },
    },
  });
};

export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params as { messageId: string };
  const { content, metadata } = req.body as { content: string; metadata?: Record<string, unknown> };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) {
    res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
    return;
  }

  // Author or admin can edit
  const myParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId: currentUserId } },
  });
  if (!myParticipant || (message.senderId !== currentUserId && myParticipant.role === 'MEMBER')) {
    res.status(403).json({ success: false, message: 'Güncelleme yetkiniz yok' });
    return;
  }

  // Mevcut editHistory: Prisma.JsonValue[] olarak ele al
  const prevHistoryJson: Prisma.JsonValue[] = Array.isArray(message.editHistory)
    ? (message.editHistory as Prisma.JsonValue[])
    : [];

  // Input tipine dönüştür: Prisma.InputJsonValue[]
  const prevHistoryInput: Prisma.InputJsonValue[] = prevHistoryJson.map(
    (h) => h as unknown as Prisma.InputJsonValue
  );

  // Yeni kayıt: InputJsonValue
  const newEntry = {
    editedById: currentUserId,
    editedAt: new Date().toISOString(),
    previousContent: message.content,
  } as unknown as Prisma.InputJsonValue;

  const newHistory: Prisma.InputJsonValue[] = [...prevHistoryInput, newEntry];

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      ...(metadata ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
      isEdited: true,
      editedAt: new Date(),
      editHistory: newHistory as unknown as Prisma.InputJsonValue[], // was: single InputJsonValue
    },
  });

  res.status(200).json({ success: true, data: { message: updated } });
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messageId } = req.params as { messageId: string };
  const { reason } = req.body as { reason?: string | null };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) {
    res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
    return;
  }

  const myParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId: currentUserId } },
  });
  if (!myParticipant || (message.senderId !== currentUserId && myParticipant.role === 'MEMBER')) {
    res.status(403).json({ success: false, message: 'Silme yetkiniz yok' });
    return;
  }

  const deleted = await prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: currentUserId,
      deletionReason: reason ?? null,
    },
  });

  res.status(200).json({ success: true, data: { message: deleted } });
};

// DM yardımcıları: userId üzerinden DIRECT konuşmayı bul/oluştur ve işlemleri yap
const getOrCreateDirectConversation = async (
  currentUserId: string,
  targetUserId: string
): Promise<Conversation> => {
  // Kendine DM engelle
  if (currentUserId === targetUserId) {
    throw new Error('Kendi kendinize mesaj gönderemezsiniz');
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      participants: { some: { userId: currentUserId } },
      AND: { participants: { some: { userId: targetUserId } } },
    },
  });

  if (existing) return existing;

  const created = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      creatorId: currentUserId,
      participants: {
        create: [
          { userId: currentUserId, role: 'OWNER' },
          { userId: targetUserId, role: 'MEMBER' },
        ],
      },
    },
  });

  return created;
};

export const sendDirectMessageByUserId = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };
  const { content, type, metadata, attachments } = req.body as {
    content?: string | null;
    type: $Enums.MessageType;
    metadata?: Record<string, unknown>;
    attachments?: Record<string, unknown>;
  };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const conv = await getOrCreateDirectConversation(currentUserId, userId);

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: conv.id, userId: currentUserId } },
    });
    if (!participant) {
      res.status(403).json({ success: false, message: 'Konuşmaya üye değilsiniz' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: currentUserId,
        content: content ?? null,
        type,
        ...(metadata ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
        ...(attachments ? { attachments: attachments as unknown as Prisma.InputJsonValue } : {}),
        isEdited: false,
        editHistory: [] as Prisma.InputJsonValue[],
        isDeleted: false,
      },
    });

    res.status(201).json({ success: true, data: { message } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Mesaj gönderilemedi';
    res.status(400).json({ success: false, message });
  }
};

export const getDirectMessagesByUserId = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const conv = await getOrCreateDirectConversation(currentUserId, userId);

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: conv.id, userId: currentUserId } },
    });
    if (!participant) {
      res.status(403).json({ success: false, message: 'Konuşmaya üye değilsiniz' });
      return;
    }

    const qp = req.query as Record<string, unknown>;
    const toNumber = (v: unknown, fallback: number): number => {
      if (typeof v === 'string') return Number(v);
      if (Array.isArray(v) && typeof v[0] === 'string') return Number(v[0]);
      return fallback;
    };
    const toBoolean = (v: unknown, fallback: boolean): boolean => {
      if (typeof v === 'string') return v === 'true';
      return fallback;
    };
    const page = toNumber(qp.page, 1);
    const limit = toNumber(qp.limit, 50);
    const sortBy = typeof qp.sortBy === 'string' && qp.sortBy === 'oldest' ? 'oldest' : 'newest';
    const includeDeleted = toBoolean(qp.includeDeleted, false);
    const typeStr = typeof qp.type === 'string' ? qp.type : undefined;

    let where: Prisma.MessageWhereInput = { conversationId: conv.id };
    if (!includeDeleted) where.isDeleted = false;

    const allowedTypes: ReadonlyArray<$Enums.MessageType> = [
      'TEXT', 'EMOJI', 'STICKER', 'GIF', 'IMAGE', 'VIDEO', 'SYSTEM',
    ];
    if (typeStr && allowedTypes.includes(typeStr as $Enums.MessageType)) {
      where.type = typeStr as $Enums.MessageType;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: sortBy === 'newest' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: { page, limit, total },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Mesajlar getirilemedi';
    res.status(400).json({ success: false, message });
  }
};

export const markDirectConversationReadByUserId = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params as { userId: string };
  const { lastReadMessageId } = req.body as { lastReadMessageId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const conv = await getOrCreateDirectConversation(currentUserId, userId);

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: conv.id, userId: currentUserId } },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Konuşmada katılımcı değilsiniz' });
      return;
    }

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: conv.id, userId: currentUserId } },
      data: { lastReadMessageId },
    });

    res.status(200).json({ success: true, message: 'Okundu olarak işaretlendi' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Okundu işaretleme başarısız';
    res.status(400).json({ success: false, message });
  }
};