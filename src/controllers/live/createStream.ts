// imports for createStream
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import crypto from 'crypto';

export async function createStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const existingStream = await prisma.liveStream.findFirst({
      where: {
        streamerId: userId,
        status: { in: ['LIVE', 'SCHEDULED'] },
      },
    });

    if (existingStream) {
      throw createError('You already have an active stream. Please end it before creating a new one.', 409);
    }

    const streamId = crypto.randomBytes(16).toString('hex');
    const streamKey = crypto.randomBytes(32).toString('hex');

    const serverRegion = req.body?.technical?.serverRegion || 'us-east';
    const rtmpUrl = `rtmp://live-${serverRegion}.example.com/live/${streamKey}`;

    const status = req.body.scheduledAt ? 'SCHEDULED' : 'LIVE';

    // Defaults for JSON blobs
    const settings = {
      allowComments: true,
      allowGifts: true,
      requireFollowToChat: false,
      slowModeDelay: 0,
      ...(req.body.settings || {}),
    };

    const stats = {
      currentViewers: 0,
      peakViewers: 0,
      totalViewers: 0,
      totalDuration: 0,
      totalComments: 0,
      totalGifts: 0,
      totalLikes: 0,
      revenue: 0,
      ...(req.body.stats || {}),
    };

    const technical = {
      streamKey,
      rtmpUrl,
      serverRegion,
      quality: ['720p', '480p', '360p'],
      ...(req.body.technical || {}),
    };

    const moderation = {
      isMuted: false,
      mutedUntil: null,
      bannedUsers: [],
      moderators: [],
      isReported: false,
      reportCount: 0,
      ...(req.body.moderation || {}),
    };

    const visibility = (req.body.visibility || 'PUBLIC').toString().toUpperCase();
    const category = (req.body.category || 'OTHER').toString().toUpperCase();

    const stream = await prisma.liveStream.create({
      data: {
        streamId,
        title: req.body.title,
        description: req.body.description,
        thumbnail: req.body.thumbnail,
        category,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        streamerId: userId,
        status,
        visibility,
        settings,
        stats,
        technical,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
        startedAt: status === 'LIVE' ? new Date() : null,
        moderation,
        monetization: req.body.monetization || {},
        metadata: req.body.metadata || {},
      },
      include: {
        streamer: { select: { username: true, displayName: true, avatar: true, isVerified: true } },
      },
    });

    logger.info(`Stream created: ${streamId} by user ${userId}`);

    // JSON alan spread hatası için teknik bilgiyi güvenli şekilde birleştir
    type TechnicalInfo = {
      streamKey?: string;
      rtmpUrl?: string;
      serverRegion?: string;
      quality?: string[];
      bitrate?: number;
      fps?: number;
      resolution?: string;
    };
    const techFromDb: TechnicalInfo =
      stream.technical && typeof stream.technical === 'object'
        ? (stream.technical as TechnicalInfo)
        : {};
    const returnedTechnical: TechnicalInfo = { ...techFromDb, streamKey: technical.streamKey };
    res.status(201).json({
      success: true,
      message: 'Stream created successfully',
      data: {
        stream: {
          ...stream,
          technical: returnedTechnical,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error creating stream:', error);
    throw error;
  }
}