// joinStream.ts - function joinStream
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

// Tipler (JSON alanları için)
interface LiveStreamModeration {
  bannedUsers?: string[];
}
interface LiveStreamTechnical {
  serverRegion?: string;
  quality?: string[];
}
interface LiveStreamStats {
  currentViewers?: number;
  peakViewers?: number;
  totalViewers?: number;
}
interface LiveStreamSettings {
  allowComments?: boolean;
  allowGifts?: boolean;
  requireFollowToChat?: boolean;
  slowModeDelay?: number;
}
type StreamerInfo = {
  username?: string;
  displayName?: string | null;
  avatar?: string | null;
  isVerified?: boolean;
};

export async function joinStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
      include: {
        streamer: { select: { username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    if (!stream) {
      throw createError('Stream not found', 404);
    }

    if (stream.status !== 'LIVE') {
      throw createError('Stream is not currently live', 400);
    }

    const isPrivileged = ['admin', 'moderator'].includes(req.user?.role || '');
    if (stream.visibility === 'PRIVATE' && stream.streamerId !== userId && !isPrivileged) {
      throw createError('You do not have permission to join this stream', 403);
    }

    const moderation = (stream.moderation ?? {}) as LiveStreamModeration;
    const banned = Array.isArray(moderation.bannedUsers) ? moderation.bannedUsers : [];
    if (userId && banned.includes(userId)) {
      throw createError('You are banned from this stream', 403);
    }

    const technical = (stream.technical ?? {}) as LiveStreamTechnical;
    const quality = (req.body.quality as string) || '720p';
    const serverRegion = technical.serverRegion || 'us-east';
    const hlsUrl = `https://cdn-${serverRegion}.example.com/hls/${stream.streamId}/${quality}/playlist.m3u8`;

    // Viewer artışı (yayıncı değilse)
    if (stream.streamerId !== userId) {
      const stats = (stream.stats ?? {}) as LiveStreamStats;
      const currentViewers = (stats.currentViewers ?? 0) + 1;
      const peakViewers = Math.max(stats.peakViewers ?? 0, currentViewers);
      const totalViewers = (stats.totalViewers ?? 0) + 1;

      await prisma.liveStream.update({
        where: { id },
        data: { stats: { ...stats, currentViewers, peakViewers, totalViewers } },
      });
    }

    logger.info(`User ${userId} joined stream ${id}`);

    const settings = (stream.settings ?? {}) as LiveStreamSettings;
    const streamerInfo: StreamerInfo = stream.streamer ?? {};

    res.json({
      success: true,
      message: 'Joined stream successfully',
      data: {
        stream: {
          id: stream.id,
          title: stream.title,
          streamer: streamerInfo,
          currentViewers: ((stream.stats ?? {}) as LiveStreamStats).currentViewers ?? 0,
          settings: {
            allowComments: settings.allowComments ?? true,
            allowGifts: settings.allowGifts ?? true,
            requireFollowToChat: settings.requireFollowToChat ?? false,
            slowModeDelay: settings.slowModeDelay ?? 0,
          },
        },
        playback: {
          hlsUrl,
          quality,
          availableQualities: technical.quality ?? ['720p', '480p', '360p'],
          autoPlay: req.body.autoPlay !== false,
          chatEnabled: req.body.chatEnabled !== false,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error joining stream:', error instanceof Error ? error : { error });
    throw error;
  }
}