import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';
import type { Prisma, Gender } from '../../generated/prisma';

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    // JWT token'dan kullanıcı ID'sini al
    const currentUserId = req.user?.id;
    
    if (!currentUserId) {
      throw createError('Authentication required', 401);
    }

    const existing = await prisma.user.findUnique({
      where: { id: currentUserId },
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
      socialLinks !== undefined
        ? {
          ...currentSocialLinks,
          ...socialLinks,
        }
        : undefined;

    // Gender değerini enum formatına çevir
    const convertGender = (genderValue: string): Gender => {
      switch (genderValue?.toLowerCase()) {
      case 'male':
        return 'MALE' as Gender;
      case 'female':
        return 'FEMALE' as Gender;
      case 'other':
        return 'OTHER' as Gender;
      case 'prefer_not_to_say':
      case 'prefer not to say':
        return 'PREFER_NOT_TO_SAY' as Gender;
      default:
        throw createError(`Invalid gender value: ${genderValue}`, 400);
      }
    };

    const updateData: Prisma.UserUpdateInput = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) updateData.gender = convertGender(gender);
    if (updatedLocation !== undefined) updateData.location = updatedLocation;
    if (updatedSocialLinks !== undefined) updateData.socialLinks = updatedSocialLinks;

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        socialLinks: true,
        role: true,
        stats: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User profile updated successfully: ${currentUserId}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
}