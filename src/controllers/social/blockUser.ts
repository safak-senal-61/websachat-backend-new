import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function blockUser(req: AuthRequest, res: Response): Promise<void> {
  const { userId } = req.params;
  // const { reason } = req.body; // İsteğe bağlı: kullanılmıyor ise kaldırılabilir
  const blockerId = req.user?.id;

  if (!blockerId) {
    res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
    return;
  }

  if (!userId) {
    res.status(400).json({ success: false, message: 'Geçersiz kullanıcı ID' });
    return;
  }

  const userToBlock = await prisma.user.findUnique({ where: { id: userId } });
  if (!userToBlock) {
    res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    return;
  }

  if (userId === blockerId) {
    res.status(400).json({ success: false, message: 'Kendinizi engelleyemezsiniz' });
    return;
  }

  await prisma.follow.updateMany({
    where: {
      OR: [
        { followerId: blockerId, followingId: userId },
        { followerId: userId, followingId: blockerId },
      ],
    },
    data: {
      isBlocked: true,
      blockedAt: new Date(),
      blockedById: blockerId,
    },
  });

  res.json({ success: true, message: 'Kullanıcı başarıyla engellendi' });
}