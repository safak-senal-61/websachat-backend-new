import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function unfollowUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const followingIdParam = req.params?.userId;
    const followerIdParam = req.user?.id;

    // Auth ve parametre doğrulama
    if (typeof followerIdParam !== 'string' || !followerIdParam.trim()) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli' });
      return;
    }
    if (typeof followingIdParam !== 'string' || !followingIdParam.trim()) {
      res.status(400).json({ success: false, message: 'Geçersiz kullanıcı kimliği' });
      return;
    }

    const followerId = followerIdParam;
    const followingId = followingIdParam;

    if (followerId === followingId) {
      res.status(400).json({ success: false, message: 'Kendi kendinizi takipten çıkaramazsınız' });
      return;
    }

    // Silinecek kayıt var mı kontrol et
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Takip ilişkisi bulunamadı' });
      return;
    }

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    res.json({ success: true, message: 'Kullanıcı takipten çıkarıldı' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı takipten çıkarılırken hata oluştu' });
  }
}