# Admin API Dokümantasyonu

Bu dokümantasyon, admin paneliyle ilgili tüm endpoint’leri ve istek/yanıt şemalarını doğrudan controller kodlarına göre özetler.

- Tüm admin endpoint’leri `Bearer` token ve `ADMIN` rolü gerektirir.
- Tarih alanları ISO tarih string olarak döner.
- Enumlar:
  - Role: `USER`, `STREAMER`, `MODERATOR`, `ADMIN`
  - StreamStatus: `SCHEDULED`, `LIVE`, `ENDED`, `PAUSED`
  - StreamVisibility: `PUBLIC`, `PRIVATE`, `FOLLOWERS_ONLY`
  - StreamCategory: `GAMING`, `MUSIC`, `ENTERTAINMENT`, `EDUCATION`, `SPORTS`, `TECHNOLOGY`, `LIFESTYLE`, `COOKING`, `ART`, `FITNESS`, `TRAVEL`, `NEWS`, `TALK_SHOW`, `COMEDY`, `OTHER`

---

## Auth (Admin Register)

### POST `/api/auth/admin/register`
- Auth: Public
- Body:
  - `username` string (zorunlu)
  - `email` string (zorunlu)
  - `password` string (zorunlu)
  - `confirmPassword` string (zorunlu)
  - `displayName` string (opsiyonel)
  - `dateOfBirth` string (opsiyonel, ISO)
  - `gender` string (opsiyonel; `male|female|other` — case-insensitive olarak Prisma `Gender` enum’a döner)
  - `country` string (opsiyonel)
  - `city` string (opsiyonel)
  - `adminSecret` string (zorunlu; `ADMIN_REGISTER_SECRET` ile eşleşmeli)
- 201 Response:
  - `success` boolean
  - `message` string
  - `data.user`: `{ id, username, email, displayName, isVerified, createdAt, role: 'admin' }`
  - `data.tokens`: `{ accessToken, refreshToken }`
- Hatalar: `403 Invalid admin secret`, `409 Email/Username conflict`, `503 Admin registration is not enabled`

---

## Overview

### GET `/api/admin/overview/stats`
- Response:
  - `success` boolean
  - `data`:
    - `users`: `{ total, active, banned }`
    - `streams`: `{ live, scheduled, ended }`
    - `comments`: `{ total }`
    - `gifts`: `{ total }`
    - `reports`: `{ pending, reviewed }`
    - `bans`: `{ active }`
    - `transactions`: `{ total }`
    - `commission`: `{ totalKurus }`

---

## Users

### GET `/api/admin/users`
- Query:
  - `page` number (default 1)
  - `limit` number (default 20)
  - `q` string (opsiyonel; username/email/displayName içinde in-memory arama)
  - `role` string (opsiyonel; `user|streamer|moderator|admin`)
  - `status` string (opsiyonel; `active|inactive|banned`)
  - `sort` string (opsiyonel; `createdAt|username|email`, default `createdAt`)
  - `order` string (opsiyonel; `asc|desc`, default `desc`)
- Response:
  - `success` boolean
  - `data`: `{ page, limit, total, pages, users: User[] }`
  - `User`: `{ id, username, email, displayName, avatar, isVerified, isActive, isBanned, role, createdAt, updatedAt }`

### PATCH `/api/admin/users/{id}/role`
- Path: `id` string
- Body: `role` string (`user|streamer|moderator|admin`)
- Response:
  - `success` boolean
  - `message` string
  - `data.user`: `{ id, username, email, role, isActive, isBanned, updatedAt }`
- Hatalar: `400 Invalid role`, `404 User not found`

---

## Streams

### GET `/api/admin/streams`
- Query:
  - `page` number (default 1), `limit` number (default 20)
  - `q` string (opsiyonel; title/description/streamer.username içinde arama)
  - `status` string (opsiyonel; `scheduled|live|ended|paused`)
  - `visibility` string (opsiyonel; `public|private|followers-only`)
  - `category` string (opsiyonel; `StreamCategory`)
  - `sort` string (opsiyonel; `createdAt|title|status`, default `createdAt`)
  - `order` string (opsiyonel; `asc|desc`, default `desc`)
- Response:
  - `success` boolean
  - `data`: `{ page, limit, total, pages, streams: Stream[] }`
  - `Stream`:
    - `id`, `streamId`, `title`, `description`, `thumbnail`, `category`, `tags[]`, `status`, `visibility`
    - `scheduledAt`, `startedAt`, `endedAt`, `createdAt`, `updatedAt`
    - `streamer`: `{ id, username, displayName, avatar }`

### PATCH `/api/admin/streams/{id}/status`
- Body: `status` string (`scheduled|live|ended|paused`)
- Response:
  - `success` boolean
  - `message` string
  - `data.stream`: `{ id, title, status, visibility, updatedAt }`
- Hatalar: `400 Invalid stream status`, `404 Stream not found`

### PATCH `/api/admin/streams/{id}/visibility`
- Body: `visibility` string (`public|private|followers-only`)
- Response:
  - `success` boolean
  - `message` string
  - `data.stream`: `{ id, title, status, visibility, updatedAt }`
- Hatalar: `400 Invalid stream visibility`, `404 Stream not found`

### PATCH `/api/admin/streams/{id}/feature`
- Body: `featured` boolean
- Response:
  - `success` boolean
  - `message` string (`Stream featured` | `Stream unfeatured`)
  - `data.stream`: `{ id, title, metadata, updatedAt }` (metadata.featured güncellenir)
- Hatalar: `404 Stream not found`

### DELETE `/api/admin/streams/{id}`
- Response:
  - `success` boolean
  - `message` string (`Stream deleted successfully`)
- Hatalar: `404 Stream not found`

---

## Gifts

### GET `/api/admin/gifts/catalog`
- Response:
  - `success` boolean
  - `data` `GiftItem[]`
  - `GiftItem`: `{ id: string|number, name: string, icon?: string, coins: number, xp: number, animation?: string }`

### PUT `/api/admin/gifts/catalog`
- Body: `{ gifts: GiftItem[] }` (her item için `id`, `name`, `coins`, `xp` zorunlu)
- Response:
  - `success` boolean
  - `message` string
  - `data` `GiftItem[]`

### POST `/api/admin/gifts`
- Body: `{ id, name, icon?, coins, xp, animation? }`
  - Default: `icon='🎁'`, `animation='bounce'`
- Response:
  - `success` boolean
  - `message` string
  - `data` `GiftItem`
- Hatalar: `400 Duplicate gift id`

### PATCH `/api/admin/gifts/{id}`
- Body (opsiyonel): `{ name?, icon?, coins?, xp?, animation? }`
- Response:
  - `success` boolean
  - `message` string
  - `data` `GiftItem`
- Hatalar: `404 Gift not found`

### DELETE `/api/admin/gifts/{id}`
- Response:
  - `success` boolean
  - `message` string

---

## Commission

### GET `/api/admin/commission/summary`
- Response:
  - `success` boolean
  - `data`:
    - `summary`: `{ totalCommissionKurus, totalCommissionTL, transactionCount }`
    - `recentTransactions`: `Transaction[]`
      - `{ id, amount, amountTL, description, createdAt, user: { id, username, email } }`
    - `dailyStats`: `{ date, totalKurus, totalTL }[]`

### GET `/api/admin/commission/report`
- Query: `startDate?`, `endDate?`, `page` (default 1), `limit` (default 50)
- Response:
  - `success` boolean
  - `data`:
    - `transactions`: `Transaction[]` (yukarıdaki shape)
    - `pagination`: `{ page, limit, total, totalPages }`
    - `summary`:
      - `totalCommissionKurus`, `totalCommissionTL`
      - `byDay`: `{ date, totalKurus, totalTL }[]`
      - `topSources`:
        - `{ userId, user: { id, username, email } | null, totalKurus, totalTL }`

---

## Gift Statistics

### GET `/api/admin/gifts/statistics`
- Query: `startDate?`, `endDate?`
- Response:
  - `success` boolean
  - `data`:
    - `summary`: `{ totalGifts, totalValue, totalValueTL }`
    - `popularGifts`: `{ giftType, count, totalCoins, totalTL }[]`
    - `dailyTrend`: `{ date, giftCount, totalCoins, totalTL }[]`

Not: `Gift.value` alanı “kuruş/cents” cinsinden tutulur; `totalTL` hesapları `value/100` ile yapılır.

---

## Levels

### GET `/api/admin/levels/settings`
- Response:
  - `success` boolean
  - `data`: `{ baseXpRequired, xpMultiplier, maxLevel, levelRewards }`
  - Varsayılanlar: `100`, `1.5`, `100`, `{}`

### PUT `/api/admin/levels/settings`
- Body (opsiyonel alanlar):
  - `baseXpRequired` number (>= 1)
  - `xpMultiplier` number (>= 1)
  - `maxLevel` number (>= 1)
  - `levelRewards` object
- Response:
  - `success` boolean
  - `message` string
  - `data` yeni ayarlar

### GET `/api/admin/levels/users`
- Query:
  - `page` (default 1), `limit` (default 50)
  - `sortBy` (`level|xp|username|createdAt`, default `level`)
  - `sortOrder` (`asc|desc`, default `desc`)
- Response:
  - `success` boolean
  - `data`:
    - `users`: `{ id, username, email, level, xp, createdAt }[]`
    - `pagination`: `{ page, limit, total, totalPages }`
    - `statistics`:
      - `totalUsers`, `averageLevel`, `averageXp`
      - `topUser`: `{ username, level, xp } | null`
      - `levelDistribution`: `{ level, userCount }[]`

### PATCH `/api/admin/levels/users/{userId}`
- Body (opsiyonel): `{ level?, xp? }` (`level >= 1`, `xp >= 0`)
- Response:
  - `success` boolean
  - `message` string
  - `data`:
    - `user`: `{ id, username, level, xp }`
    - `changes`: `{ level: boolean, xp: boolean }`
- Hatalar: `400 Geçersiz veri`, `404 Kullanıcı bulunamadı`

### GET `/api/admin/levels/calculate`
- Query: `xp` number (zorunlu)
- Response:
  - `success` boolean
  - `data`: `{ currentXp, currentLevel, currentLevelProgress, nextLevelXpRequired, progressPercentage, isMaxLevel }`

---

## Gift Economy

### GET `/api/admin/gift/economy`
- Response:
  - `success` boolean
  - `data`: `{ coin_kurus, commission_rate }`
  - Varsayılanlar: `{ coin_kurus: 5, commission_rate: 0.5 }`

### PUT `/api/admin/gift/economy`
- Body:
  - `coin_kurus` number (pozitif; integer’a çevrilir)
  - `commission_rate` number (0–1 arası)
- Response:
  - `success` boolean
  - `message` string
  - `data`: `{ coin_kurus, commission_rate }`
- Hatalar: `400 coin_kurus`, `400 commission_rate`

---