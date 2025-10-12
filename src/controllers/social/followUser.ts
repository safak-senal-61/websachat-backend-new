import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function followUser(req: AuthRequest, res: Response): Promise<void> {
  // Parametre ve kimlik doğrulama kontrolleri
  const userIdParam = req.params?.userId;
  const followingId =
    typeof userIdParam === 'string' && userIdParam.trim().length > 0 ? userIdParam : undefined;

  const followerIdParam = req.user?.id;
  const followerId =
    typeof followerIdParam === 'string' && followerIdParam.trim().length > 0 ? followerIdParam : undefined;

  // notificationsEnabled'i güvenli boolean'a dönüştür
  const notificationsEnabledRaw: unknown = (req.body as { notificationsEnabled?: unknown })?.notificationsEnabled;
  let notificationsEnabled: boolean = true;
  if (typeof notificationsEnabledRaw === 'boolean') {
    notificationsEnabled = notificationsEnabledRaw;
  } else if (typeof notificationsEnabledRaw === 'string') {
    notificationsEnabled = notificationsEnabledRaw.toLowerCase() === 'true';
  } else if (typeof notificationsEnabledRaw === 'number') {
    notificationsEnabled = notificationsEnabledRaw !== 0;
  }

  if (!followerId) {
    res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
    return;
  }

  if (!followingId) {
    res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
    return;
  }

  if (followingId === followerId) {
    res.status(400).json({ success: false, message: 'Kendinizi takip edemezsiniz' });
    return;
  }

  const userToFollow = await prisma.user.findUnique({ where: { id: followingId } });
  if (!userToFollow) {
    res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    return;
  }

  const existingFollow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existingFollow) {
    res.status(400).json({ success: false, message: 'Bu kullanıcıyı zaten takip ediyorsunuz' });
    return;
  }

  const follow = await prisma.follow.create({
    data: { followerId, followingId, notificationsEnabled },
  });

  res.status(201).json({
    success: true,
    message: 'Kullanıcı başarıyla takip edildi',
    data: follow,
  });
}