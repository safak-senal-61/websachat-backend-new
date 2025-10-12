import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import type { Prisma, Gender } from '../../generated/prisma';

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: userIdParam } = req.params;
    if (!userIdParam) {
      throw createError('User ID is required', 400);
    }
    const currentUserId = req.user?.id;

    // Check if user is updating their own profile or is admin
    if (currentUserId !== userIdParam && req.user?.role !== 'admin') {
      throw createError('You can only update your own profile', 403);
    }

    const existing = await prisma.user.findUnique({
      where: { id: userIdParam },
      select: { location: true, socialLinks: true },
    });
    if (!existing) {
      throw createError('User not found', 404);
    }

    const {
      displayName,
      bio,
      dateOfBirth,
      gender,
      country,
      city,
      // phone is not part of Prisma schema; remove to avoid errors
      socialLinks,
    } = req.body;

    const currentLocation =
      typeof existing.location === 'object' && existing.location !== null
        ? (existing.location as Record<string, unknown>)
        : {};
    const updatedLocation =
      country !== undefined || city !== undefined
        ? {
          ...currentLocation,
          ...(country !== undefined ? { country } : {}),
          ...(city !== undefined ? { city } : {}),
        }
        : undefined;

    const currentSocialLinks =
      typeof existing.socialLinks === 'object' && existing.socialLinks !== null
        ? (existing.socialLinks as Record<string, unknown>)
        : {};
    const updatedSocialLinks =
      socialLinks !== undefined && typeof socialLinks === 'object' && socialLinks !== null
        ? { ...currentSocialLinks, ...(socialLinks as Record<string, unknown>) }
        : socialLinks !== undefined
          ? currentSocialLinks
          : undefined;

    // Gender string -> Gender enum güvenli dönüşüm
    const genderValue: Gender | undefined =
      typeof gender === 'string'
        ? (['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(gender.toUpperCase())
          ? (gender.toUpperCase() as Gender)
          : undefined)
        : undefined;

    // Update inputunu Prisma.UserUpdateInput olarak güvenli kur
    const data: Prisma.UserUpdateInput = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (bio !== undefined) data.bio = bio;
    if (dateOfBirth !== undefined) {
      data.dateOfBirth =
        typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : (dateOfBirth as Date);
    }
    if (genderValue !== undefined) data.gender = genderValue;
    if (updatedLocation !== undefined) {
      data.location = updatedLocation as unknown as Prisma.InputJsonValue;
    }
    if (updatedSocialLinks !== undefined) {
      data.socialLinks = updatedSocialLinks as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.user.update({
      where: { id: userIdParam },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        socialLinks: true,
        updatedAt: true,
      },
    });

    const loc =
      typeof updated.location === 'object' && updated.location !== null
        ? (updated.location as Record<string, unknown>)
        : {};

    logger.info('User profile updated', { userId: updated.id, updatedBy: currentUserId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          bio: updated.bio,
          dateOfBirth: updated.dateOfBirth,
          gender: updated.gender,
          country: (loc.country as string | null) ?? null,
          city: (loc.city as string | null) ?? null,
          socialLinks:
            typeof updated.socialLinks === 'object' && updated.socialLinks !== null
              ? updated.socialLinks
              : {},
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update profile failed', { error, userId: req.params.id });
    throw error;
  }
}