# Live Streaming Endpoints Documentation

Bu dosya, canlı yayın (live streaming) modülünün tüm endpoint'lerini, request ve response JSON verilerini içermektedir.

## 📋 İçindekiler

1. [Yayın Yönetimi (Stream Management)](#yayın-yönetimi-stream-management)
2. [Yayın Katılımı (Stream Participation)](#yayın-katılımı-stream-participation)
3. [Yayın Arama ve Keşif (Stream Discovery)](#yayın-arama-ve-keşif-stream-discovery)
4. [Moderasyon (Moderation)](#moderasyon-moderation)
5. [Analitik (Analytics)](#analitik-analytics)
6. [Raporlama (Reporting)](#raporlama-reporting)

---

## 🎥 Yayın Yönetimi (Stream Management)

### 1. Yayın Oluştur
**POST** `/api/live/streams`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "title": "Minecraft Survival Serisi #15",
  "description": "Yeni dünyamızda ev inşa ediyoruz! Herkesi bekliyoruz.",
  "category": "gaming",
  "tags": ["minecraft", "survival", "building", "türkçe"],
  "visibility": "public",
  "scheduledAt": "2024-01-15T20:00:00.000Z",
  "settings": {
    "allowComments": true,
    "requireFollowToChat": false,
    "enableDonations": true,
    "enableSubscriptions": true,
    "chatDelay": 0,
    "moderationLevel": "medium"
  },
  "technical": {
    "quality": "1080p",
    "fps": 60,
    "bitrate": 6000,
    "encoder": "x264"
  },
  "monetization": {
    "enableAds": true,
    "subscriptionPrice": 9.99,
    "donationGoal": 500,
    "donationGoalDescription": "Yeni mikrofon için"
  },
  "metadata": {
    "language": "tr",
    "ageRating": "13+",
    "thumbnail": "https://example.com/thumbnails/stream123.jpg"
  }
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Yayın başarıyla oluşturuldu",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "streamId": "live_abc123def456",
    "streamKey": "sk_live_xyz789uvw012",
    "title": "Minecraft Survival Serisi #15",
    "description": "Yeni dünyamızda ev inşa ediyoruz! Herkesi bekliyoruz.",
    "category": "gaming",
    "tags": ["minecraft", "survival", "building", "türkçe"],
    "visibility": "public",
    "status": "scheduled",
    "scheduledAt": "2024-01-15T20:00:00.000Z",
    "streamerId": "507f1f77bcf86cd799439012",
    "settings": {
      "allowComments": true,
      "requireFollowToChat": false,
      "enableDonations": true,
      "enableSubscriptions": true,
      "chatDelay": 0,
      "moderationLevel": "medium"
    },
    "stats": {
      "viewers": 0,
      "maxViewers": 0,
      "likes": 0,
      "dislikes": 0,
      "shares": 0,
      "duration": 0
    },
    "technical": {
      "quality": "1080p",
      "fps": 60,
      "bitrate": 6000,
      "encoder": "x264",
      "ingestUrl": "rtmp://ingest.example.com/live",
      "playbackUrl": "https://cdn.example.com/live/abc123def456/playlist.m3u8"
    },
    "monetization": {
      "enableAds": true,
      "subscriptionPrice": 9.99,
      "donationGoal": 500,
      "donationGoalDescription": "Yeni mikrofon için",
      "totalDonations": 0,
      "totalSubscriptions": 0
    },
    "metadata": {
      "language": "tr",
      "ageRating": "13+",
      "thumbnail": "https://example.com/thumbnails/stream123.jpg"
    },
    "moderation": {
      "bannedUsers": [],
      "moderators": [],
      "chatRules": []
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Yayın Güncelle
**PUT** `/api/live/streams/{streamId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "title": "Minecraft Survival Serisi #15 - UPDATED",
  "description": "Güncellenen açıklama",
  "category": "gaming",
  "tags": ["minecraft", "survival", "building", "türkçe", "updated"],
  "settings": {
    "allowComments": true,
    "requireFollowToChat": true,
    "chatDelay": 5
  }
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yayın başarıyla güncellendi",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Minecraft Survival Serisi #15 - UPDATED",
    "description": "Güncellenen açıklama",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 3. Yayın Detaylarını Getir
**GET** `/api/live/streams/{streamId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "streamId": "live_abc123def456",
    "title": "Minecraft Survival Serisi #15",
    "description": "Yeni dünyamızda ev inşa ediyoruz! Herkesi bekliyoruz.",
    "category": "gaming",
    "tags": ["minecraft", "survival", "building", "türkçe"],
    "visibility": "public",
    "status": "live",
    "startedAt": "2024-01-15T20:00:00.000Z",
    "streamer": {
      "id": "507f1f77bcf86cd799439012",
      "username": "yayinci123",
      "displayName": "Yayıncı 123",
      "avatar": "https://example.com/avatars/streamer123.jpg",
      "verified": true,
      "followerCount": 15420,
      "subscriberCount": 1250
    },
    "stats": {
      "viewers": 342,
      "maxViewers": 456,
      "likes": 89,
      "dislikes": 3,
      "shares": 12,
      "duration": 3600
    },
    "technical": {
      "quality": "1080p",
      "fps": 60,
      "playbackUrl": "https://cdn.example.com/live/abc123def456/playlist.m3u8"
    },
    "settings": {
      "allowComments": true,
      "requireFollowToChat": false,
      "enableDonations": true,
      "enableSubscriptions": true
    }
  }
}
```

### 4. Yayını Sonlandır
**POST** `/api/live/streams/{streamId}/end`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yayın başarıyla sonlandırıldı",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "status": "ended",
    "endedAt": "2024-01-15T22:30:00.000Z",
    "finalStats": {
      "totalViewers": 1250,
      "maxViewers": 456,
      "duration": 9000,
      "totalDonations": 125.50,
      "newSubscribers": 15
    }
  }
}
```

---

## 👥 Yayın Katılımı (Stream Participation)

### 1. Yayına Katıl
**POST** `/api/live/streams/{streamId}/join`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "quality": "720p",
  "autoPlay": true,
  "chatEnabled": true
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yayına başarıyla katıldınız",
  "data": {
    "viewerToken": "vt_abc123def456ghi789",
    "playbackUrl": "https://cdn.example.com/live/abc123def456/720p/playlist.m3u8",
    "chatToken": "ct_xyz789uvw012rst345",
    "viewerCount": 343,
    "streamInfo": {
      "title": "Minecraft Survival Serisi #15",
      "streamer": "Yayıncı 123",
      "category": "gaming",
      "startedAt": "2024-01-15T20:00:00.000Z"
    }
  }
}
```

### 2. Yayından Ayrıl
**POST** `/api/live/streams/{streamId}/leave`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yayından başarıyla ayrıldınız"
}
```

---

## 🔍 Yayın Arama ve Keşif (Stream Discovery)

### 1. Yayın Ara
**GET** `/api/live/streams/search`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `query` (string, optional): Arama terimi
- `category` (string, optional): Kategori filtresi
- `status` (string, optional): Yayın durumu (live, scheduled, ended)
- `visibility` (string, optional): Görünürlük (public, private, unlisted)
- `language` (string, optional): Dil kodu
- `ageRating` (string, optional): Yaş sınırı
- `minViewers` (number, optional): Minimum izleyici sayısı
- `maxViewers` (number, optional): Maksimum izleyici sayısı
- `tags` (string, optional): Etiketler (virgülle ayrılmış)
- `sortBy` (string, optional): Sıralama (viewers, created, title, duration)
- `sortOrder` (string, optional): Sıralama yönü (asc, desc)
- `page` (number, optional): Sayfa numarası
- `limit` (number, optional): Sayfa başına sonuç sayısı

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "streams": [
      {
        "id": "507f1f77bcf86cd799439011",
        "streamId": "live_abc123def456",
        "title": "Minecraft Survival Serisi #15",
        "description": "Yeni dünyamızda ev inşa ediyoruz!",
        "category": "gaming",
        "tags": ["minecraft", "survival", "building"],
        "status": "live",
        "startedAt": "2024-01-15T20:00:00.000Z",
        "thumbnail": "https://example.com/thumbnails/stream123.jpg",
        "streamer": {
          "id": "507f1f77bcf86cd799439012",
          "username": "yayinci123",
          "displayName": "Yayıncı 123",
          "avatar": "https://example.com/avatars/streamer123.jpg",
          "verified": true
        },
        "stats": {
          "viewers": 342,
          "likes": 89,
          "duration": 3600
        },
        "technical": {
          "quality": "1080p",
          "fps": 60
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "filters": {
      "categories": ["gaming", "music", "talk", "art"],
      "languages": ["tr", "en", "de", "fr"],
      "ageRatings": ["all", "13+", "18+"]
    }
  }
}
```

### 2. Popüler Yayınları Getir
**GET** `/api/live/streams/top`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `period` (string, optional): Zaman aralığı (hour, day, week, month)
- `category` (string, optional): Kategori filtresi
- `metric` (string, optional): Metrik (viewers, likes, duration)
- `limit` (number, optional): Sonuç sayısı (varsayılan: 20, max: 50)

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "streams": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Minecraft Survival Serisi #15",
        "category": "gaming",
        "status": "live",
        "streamer": {
          "username": "yayinci123",
          "displayName": "Yayıncı 123",
          "avatar": "https://example.com/avatars/streamer123.jpg"
        },
        "stats": {
          "viewers": 342,
          "maxViewers": 456,
          "likes": 89
        },
        "rank": 1
      }
    ],
    "period": "day",
    "category": "all",
    "metric": "viewers"
  }
}
```

### 3. Kullanıcının Yayınlarını Getir
**GET** `/api/live/streams/user/{userId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `status` (string, optional): Yayın durumu filtresi
- `page` (number, optional): Sayfa numarası
- `limit` (number, optional): Sayfa başına sonuç sayısı

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "streams": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Minecraft Survival Serisi #15",
        "status": "live",
        "startedAt": "2024-01-15T20:00:00.000Z",
        "stats": {
          "viewers": 342,
          "duration": 3600
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## 🛡️ Moderasyon (Moderation)

### 1. Kullanıcıyı Modere Et
**POST** `/api/live/streams/{streamId}/moderate`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "action": "timeout",
  "userId": "507f1f77bcf86cd799439013",
  "reason": "Spam mesaj gönderme",
  "duration": 600
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Moderasyon işlemi başarıyla uygulandı",
  "data": {
    "action": "timeout",
    "userId": "507f1f77bcf86cd799439013",
    "reason": "Spam mesaj gönderme",
    "duration": 600,
    "expiresAt": "2024-01-15T21:10:00.000Z",
    "moderatorId": "507f1f77bcf86cd799439012",
    "appliedAt": "2024-01-15T21:00:00.000Z"
  }
}
```

**Moderasyon Aksiyonları:**
- `timeout`: Geçici susturma
- `ban`: Kalıcı yasaklama
- `unban`: Yasağı kaldırma
- `mod`: Moderatör yapma
- `unmod`: Moderatörlükten çıkarma
- `vip`: VIP yapma
- `unvip`: VIP'ten çıkarma

---

## 📊 Analitik (Analytics)

### 1. Yayın Analitiği Getir
**GET** `/api/live/streams/{streamId}/analytics`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `period` (string, optional): Zaman aralığı (hour, day, week, month)
- `metrics` (string, optional): Metrikler (virgülle ayrılmış)
- `startDate` (string, optional): Başlangıç tarihi
- `endDate` (string, optional): Bitiş tarihi

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "streamId": "507f1f77bcf86cd799439011",
    "period": "day",
    "metrics": {
      "viewers": {
        "current": 342,
        "peak": 456,
        "average": 298,
        "total": 1250,
        "timeline": [
          {
            "timestamp": "2024-01-15T20:00:00.000Z",
            "value": 50
          },
          {
            "timestamp": "2024-01-15T20:15:00.000Z",
            "value": 120
          }
        ]
      },
      "engagement": {
        "likes": 89,
        "dislikes": 3,
        "shares": 12,
        "comments": 456,
        "chatMessages": 1250
      },
      "revenue": {
        "donations": 125.50,
        "subscriptions": 89.91,
        "ads": 45.20,
        "total": 260.61
      },
      "technical": {
        "quality": "1080p",
        "fps": 60,
        "bitrate": 6000,
        "dropRate": 0.02,
        "latency": 2.5
      }
    },
    "demographics": {
      "countries": [
        {"country": "TR", "percentage": 65.2},
        {"country": "DE", "percentage": 15.8},
        {"country": "US", "percentage": 12.1}
      ],
      "ageGroups": [
        {"range": "18-24", "percentage": 35.4},
        {"range": "25-34", "percentage": 42.1},
        {"range": "35-44", "percentage": 18.7}
      ],
      "devices": [
        {"type": "desktop", "percentage": 58.3},
        {"type": "mobile", "percentage": 35.2},
        {"type": "tablet", "percentage": 6.5}
      ]
    }
  }
}
```

---

## 🚨 Raporlama (Reporting)

### 1. Yayını Raporla
**POST** `/api/live/streams/{streamId}/report`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "reason": "inappropriate_content",
  "description": "Yayında uygunsuz içerik var",
  "timestamp": "2024-01-15T21:15:30.000Z"
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Rapor başarıyla gönderildi",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "streamId": "507f1f77bcf86cd799439011",
    "reporterId": "507f1f77bcf86cd799439015",
    "reason": "inappropriate_content",
    "description": "Yayında uygunsuz içerik var",
    "timestamp": "2024-01-15T21:15:30.000Z",
    "status": "pending",
    "createdAt": "2024-01-15T21:16:00.000Z"
  }
}
```

**Rapor Sebepleri:**
- `inappropriate_content`: Uygunsuz içerik
- `spam`: Spam
- `harassment`: Taciz
- `violence`: Şiddet
- `copyright`: Telif hakkı ihlali
- `hate_speech`: Nefret söylemi
- `other`: Diğer

---

## 📤 Dosya Yükleme

### 1. Thumbnail Yükle
**POST** `/api/live/streams/{streamId}/thumbnail`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "multipart/form-data"
}
```

**Form Data:**
- `thumbnail` (file): Thumbnail dosyası

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Thumbnail başarıyla yüklendi",
  "data": {
    "url": "https://cdn.example.com/thumbnails/stream123_custom.jpg",
    "size": 245760,
    "dimensions": {
      "width": 1280,
      "height": 720
    }
  }
}
```

---

## 🔧 Genel Hata Yanıtları

### Kimlik Doğrulama Hatası
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Geçersiz veya eksik token"
}
```

### Yetkilendirme Hatası
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Bu işlemi gerçekleştirmek için yetkiniz yok"
}
```

### Kaynak Bulunamadı
```json
{
  "success": false,
  "error": "STREAM_NOT_FOUND",
  "message": "Yayın bulunamadı"
}
```

### Doğrulama Hatası
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Geçersiz veri",
  "details": [
    {
      "field": "title",
      "message": "Yayın başlığı en az 3 karakter olmalıdır",
      "code": "MIN_LENGTH"
    }
  ]
}
```

### Yayın Durumu Hatası
```json
{
  "success": false,
  "error": "INVALID_STREAM_STATE",
  "message": "Bu işlem yayın durumunda gerçekleştirilemez"
}
```

### Hız Sınırı Aşımı
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Çok fazla istek gönderiyorsunuz. Lütfen bekleyin.",
  "retryAfter": 60
}
```

### Sunucu Hatası
```json
{
  "success": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Sunucu hatası oluştu"
}
```

---

## 📝 Notlar

### Kimlik Doğrulama
- Tüm endpoint'ler JWT token ile kimlik doğrulama gerektirir
- Token `Authorization` header'ında `Bearer {token}` formatında gönderilmelidir

### Hız Sınırlaması
- Yayın oluşturma: Saatte 5 istek
- Yayın güncelleme: Dakikada 10 istek
- Yayın arama: Dakikada 60 istek
- Analitik: Dakikada 30 istek
- Moderasyon: Dakikada 20 istek

### Sayfalama
- Varsayılan sayfa boyutu: 20
- Maksimum sayfa boyutu: 50
- Sayfa numaraları 1'den başlar

### Doğrulama
- Yayın başlığı: 3-100 karakter arası
- Açıklama: Maksimum 1000 karakter
- Etiketler: Maksimum 10 adet, her biri 20 karakter
- Kategori: Önceden tanımlanmış kategorilerden biri

### ID Formatları
- Tüm ID'ler MongoDB ObjectId formatındadır (24 karakter hex string)
- Stream ID'ler: `live_` prefix'i ile başlar
- Stream Key'ler: `sk_live_` prefix'i ile başlar

### Zaman Damgaları
- Tüm tarihler ISO 8601 formatında UTC olarak döndürülür

### Dosya Yükleme
- Thumbnail: Maksimum 5MB, JPG/PNG formatı
- Boyut: 1280x720 (16:9 oran) önerilir

### WebSocket Bağlantıları
- Gerçek zamanlı yayın durumu için WebSocket kullanılır
- Bağlantı URL'si: `wss://api.example.com/live/{streamId}/status`

### Teknik Gereksinimler
- Video: H.264 codec, 1080p maksimum çözünürlük
- Audio: AAC codec, 48kHz sample rate
- Bitrate: 6000 kbps maksimum
- FPS: 60 fps maksimum

### Monetizasyon
- Bağışlar: Minimum 1 TL, maksimum 1000 TL
- Abonelikler: Aylık 9.99 TL - 99.99 TL arası
- Reklamlar: Yayıncı gelir payı %70

### Moderasyon
- Timeout süresi: 1 dakika - 24 saat arası
- Ban kalıcıdır, sadece yayıncı kaldırabilir
- Moderatörler timeout ve ban yetkisine sahiptir