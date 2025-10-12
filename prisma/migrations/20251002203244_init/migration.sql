-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "StreamCategory" AS ENUM ('GAMING', 'MUSIC', 'ENTERTAINMENT', 'EDUCATION', 'SPORTS', 'TECHNOLOGY', 'LIFESTYLE', 'COOKING', 'ART', 'FITNESS', 'TRAVEL', 'NEWS', 'TALK_SHOW', 'COMEDY', 'OTHER');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'PAUSED');

-- CreateEnum
CREATE TYPE "StreamVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('TEXT', 'EMOJI', 'STICKER', 'GIF');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'COMMENT', 'GIFT', 'STREAM_START', 'STREAM_END', 'MENTION', 'LIKE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('USER', 'STREAM', 'COMMENT', 'SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatar" TEXT,
    "coverImage" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "location" JSONB,
    "website" TEXT,
    "socialLinks" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationBadge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),
    "banReason" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showLastSeen" BOOLEAN NOT NULL DEFAULT true,
    "streamingSettings" JSONB,
    "stats" JSONB,
    "preferences" JSONB,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "backupCodes" TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIP" TEXT,
    "loginHistory" JSONB[],
    "monetization" JSONB,
    "notificationSettings" JSONB,
    "moderation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_streams" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" "StreamCategory" NOT NULL,
    "tags" TEXT[],
    "streamerId" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visibility" "StreamVisibility" NOT NULL DEFAULT 'PUBLIC',
    "settings" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "technical" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastHeartbeat" TIMESTAMP(3),
    "moderation" JSONB NOT NULL,
    "monetization" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CommentType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "parentCommentId" TEXT,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "reactions" JSONB NOT NULL,
    "userReactions" JSONB NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editHistory" JSONB[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deletionReason" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "hiddenReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "reports" JSONB[],
    "moderation" JSONB NOT NULL,
    "engagement" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifts" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "streamId" TEXT,
    "giftType" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "live_streams_streamId_key" ON "live_streams"("streamId");

-- CreateIndex
CREATE INDEX "live_streams_status_visibility_idx" ON "live_streams"("status", "visibility");

-- CreateIndex
CREATE INDEX "live_streams_streamerId_status_idx" ON "live_streams"("streamerId", "status");

-- CreateIndex
CREATE INDEX "live_streams_category_status_idx" ON "live_streams"("category", "status");

-- CreateIndex
CREATE INDEX "live_streams_createdAt_idx" ON "live_streams"("createdAt");

-- CreateIndex
CREATE INDEX "comments_streamId_createdAt_idx" ON "comments"("streamId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_parentCommentId_idx" ON "comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt");

-- CreateIndex
CREATE INDEX "follows_followerId_createdAt_idx" ON "follows"("followerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "gifts_streamId_createdAt_idx" ON "gifts"("streamId", "createdAt");

-- CreateIndex
CREATE INDEX "gifts_receiverId_createdAt_idx" ON "gifts"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "gifts_senderId_createdAt_idx" ON "gifts"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "reports_reportedId_status_idx" ON "reports"("reportedId", "status");

-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "live_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "live_streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
