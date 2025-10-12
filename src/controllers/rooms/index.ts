// Dosya başındaki importlar
import type { Response } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { prisma } from '@/config/database';
import type { Prisma, $Enums } from '@/generated/prisma';

const parseMentions = (text?: string | null): string[] => {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  return matches ? matches.map((m) => m.slice(1).toLowerCase()) : [];
};

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, visibility, settings, metadata } = req.body as {
    name: string;
    description?: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const room = await prisma.chatRoom.create({
    data: {
      name,
      description: description ?? null,
      ownerId: currentUserId,
      visibility,
      // JSON alanlarını sadece mevcutsa ekleyelim (undefined set etmeyelim)
      ...(settings !== undefined ? { settings: settings as unknown as Prisma.InputJsonValue } : {}),
      ...(metadata !== undefined ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
      memberships: {
        create: { userId: currentUserId, role: 'OWNER' },
      },
    },
  });

  res.status(201).json({ success: true, data: { room } });
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomId } = req.params as { roomId: string };
  const { userId, role } = req.body as { userId: string; role: 'MEMBER' | 'MODERATOR' | 'OWNER' };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Oda bulunamadı' });
    return;
  }

  const me = await prisma.chatRoomMembership.findUnique({
    where: { roomId_userId: { roomId, userId: currentUserId } },
  });
  if (!me || (me.role !== 'OWNER' && me.role !== 'MODERATOR' && room.ownerId !== currentUserId)) {
    res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    return;
  }

  const existing = await prisma.chatRoomMembership.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (existing) {
    res.status(409).json({ success: false, message: 'Kullanıcı zaten üye' });
    return;
  }

  const membership = await prisma.chatRoomMembership.create({ data: { roomId, userId, role } });

  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title: 'Odaya davet',
      message: 'Bir sohbet odasına davet edildiniz',
      data: ({ roomId } as unknown as Prisma.InputJsonValue),
    },
  });

  res.status(201).json({ success: true, data: { membership } });
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomId, userId } = req.params as { roomId: string; userId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    res.status(404).json({ success: false, message: 'Oda bulunamadı' });
    return;
  }

  const me = await prisma.chatRoomMembership.findUnique({
    where: { roomId_userId: { roomId, userId: currentUserId } },
  });
  if (!me || (me.role !== 'OWNER' && me.role !== 'MODERATOR' && room.ownerId !== currentUserId)) {
    res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    return;
  }

  await prisma.chatRoomMembership.delete({ where: { roomId_userId: { roomId, userId } } });

  res.status(200).json({ success: true, message: 'Üye kaldırıldı' });
};

export const sendRoomMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomId } = req.params as { roomId: string };
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

  const membership = await prisma.chatRoomMembership.findUnique({
    where: { roomId_userId: { roomId, userId: currentUserId } },
  });
  if (!membership) {
    res.status(403).json({ success: false, message: 'Odaya üye değilsiniz' });
    return;
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: currentUserId,
      content: content ?? null,
      type,
      ...(metadata !== undefined ? { metadata: metadata as unknown as Prisma.InputJsonValue } : {}),
      ...(attachments !== undefined ? { attachments: attachments as unknown as Prisma.InputJsonValue } : {}),
      isEdited: false,
      editHistory: [] as Prisma.InputJsonValue[],
      isDeleted: false,
    },
  });

  const mentionedUsernames = parseMentions(content ?? undefined);
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
        message: 'Bir oda mesajında sizden bahsedildi',
        data: ({ roomId, messageId: message.id } as unknown as Prisma.InputJsonValue),
      })),
    });
  }

  res.status(201).json({ success: true, data: { message } });
};

export const getRoomMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomId } = req.params as { roomId: string };

  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const membership = await prisma.chatRoomMembership.findUnique({
    where: { roomId_userId: { roomId, userId: currentUserId } },
  });
  if (!membership) {
    res.status(403).json({ success: false, message: 'Odaya üye değilsiniz' });
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

  let where: Prisma.ChatMessageWhereInput = { roomId };
  if (!includeDeleted) where.isDeleted = false;

  const allowedTypes: ReadonlyArray<$Enums.MessageType> = [
    'TEXT', 'IMAGE', 'VIDEO', 'STICKER', 'GIF', 'SYSTEM',
  ];
  if (typeStr && allowedTypes.includes(typeStr as $Enums.MessageType)) {
    where.type = typeStr as $Enums.MessageType;
  }

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: sortBy === 'newest' ? 'desc' : 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.chatMessage.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      messages,
      pagination: { page, limit, total },
    },
  });
};