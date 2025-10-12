import { Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../../middleware/auth';

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (userId && refreshToken) {
      // Kullanıcının backupCodes listesini al
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { backupCodes: true }
      });

      if (user) {
        // REFRESH tokenını listeden çıkar
        const updatedCodes = (user.backupCodes || []).filter(code => code !== `REFRESH:${refreshToken}`);

        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes }
        });
      }
    }

    logger.info('User logged out successfully', { userId });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout failed', { error, userId: req.user?.id });
    throw error;
  }
}