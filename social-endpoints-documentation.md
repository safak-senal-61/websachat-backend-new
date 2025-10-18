# Social Endpoints Documentation

Bu dosya, sosyal modülünün tüm endpoint'lerini, request ve response JSON verilerini içermektedir.

## 📋 İçindekiler

1. [Takip Sistemi (Follow System)](#takip-sistemi-follow-system)
2. [Hediye Sistemi (Gift System)](#hediye-sistemi-gift-system)
3. [Yorum Sistemi (Comment System)](#yorum-sistemi-comment-system)
4. [Tepki Sistemi (Reaction System)](#tepki-sistemi-reaction-system)

---

## 🔗 Takip Sistemi (Follow System)

### 1. Kullanıcıyı Takip Et
**POST** `/api/social/follow/{userId}`

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
  "userId": "507f1f77bcf86cd799439011",
  "notificationsEnabled": true
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla takip edildi",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "followerId": "507f1f77bcf86cd799439013",
    "followingId": "507f1f77bcf86cd799439011",
    "notificationsEnabled": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - Zaten takip ediliyor
{
  "success": false,
  "message": "Bu kullanıcıyı zaten takip ediyorsunuz"
}

// 404 - Kullanıcı bulunamadı
{
  "success": false,
  "message": "Kullanıcı bulunamadı"
}

// 401 - Yetkisiz erişim
{
  "success": false,
  "message": "Kimlik doğrulaması gerekli"
}
```

### 2. Kullanıcıyı Takipten Çıkar
**DELETE** `/api/social/unfollow/{userId}`

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
  "message": "Kullanıcı takipten çıkarıldı"
}
```

### 3. Takipçileri Getir
**GET** `/api/social/followers/{userId}?page=1&limit=20&search=username`

**Query Parameters:**
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20, max: 100): Sayfa başına öğe sayısı
- `search` (string, optional): Arama terimi

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "507f1f77bcf86cd799439012",
        "followerId": "507f1f77bcf86cd799439013",
        "followingId": "507f1f77bcf86cd799439011",
        "notificationsEnabled": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "follower": {
          "id": "507f1f77bcf86cd799439013",
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "isVerified": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 4. Takip Edilenleri Getir
**GET** `/api/social/following/{userId}?page=1&limit=20&search=username`

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "following": [
      {
        "id": "507f1f77bcf86cd799439012",
        "followerId": "507f1f77bcf86cd799439013",
        "followingId": "507f1f77bcf86cd799439011",
        "notificationsEnabled": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "following": {
          "id": "507f1f77bcf86cd799439011",
          "username": "jane_doe",
          "displayName": "Jane Doe",
          "avatar": "https://example.com/avatar2.jpg",
          "isVerified": false
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75,
      "pages": 4
    }
  }
}
```

### 5. Kullanıcıyı Engelle
**POST** `/api/social/block/{userId}`

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
  "userId": "507f1f77bcf86cd799439011",
  "reason": "harassment"
}
```

**Reason Options:**
- `harassment`: Taciz
- `spam`: Spam
- `inappropriate_content`: Uygunsuz içerik
- `fake_account`: Sahte hesap
- `other`: Diğer

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla engellendi"
}
```

---

## 🎁 Hediye Sistemi (Gift System)

### 1. Hediye Gönder
**POST** `/api/social/gifts/send`

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
  "receiverId": "507f1f77bcf86cd799439011",
  "streamId": "507f1f77bcf86cd799439014",
  "giftType": "rose",
  "quantity": 5,
  "message": "Harika yayın!",
  "isAnonymous": false,
  "isPublic": true
}
```

**Gift Types:**
- `rose`, `heart`, `diamond`, `crown`, `car`, `yacht`, `rocket`
- `fireworks`, `rainbow`, `unicorn`, `dragon`, `phoenix`, `galaxy`
- `treasure`, `castle`, `throne`, `meteor`, `comet`, `star`

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Hediye başarıyla gönderildi",
  "data": {
    "id": "507f1f77bcf86cd799439015",
    "senderId": "507f1f77bcf86cd799439013",
    "receiverId": "507f1f77bcf86cd799439011",
    "streamId": "507f1f77bcf86cd799439014",
    "giftType": "rose",
    "quantity": 5,
    "totalCost": 50,
    "message": "Harika yayın!",
    "isAnonymous": false,
    "isPublic": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Hediye Geçmişi
**GET** `/api/social/gifts/history?type=all&page=1&limit=20&giftType=rose&startDate=2024-01-01&endDate=2024-01-31`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `type` (string, default: "all"): `sent`, `received`, `all`
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 20, max: 100): Sayfa başına öğe sayısı
- `giftType` (string, optional): Hediye türü filtresi
- `startDate` (date, optional): Başlangıç tarihi
- `endDate` (date, optional): Bitiş tarihi

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "gifts": [
      {
        "id": "507f1f77bcf86cd799439015",
        "senderId": "507f1f77bcf86cd799439013",
        "receiverId": "507f1f77bcf86cd799439011",
        "streamId": "507f1f77bcf86cd799439014",
        "giftType": "rose",
        "quantity": 5,
        "totalCost": 50,
        "message": "Harika yayın!",
        "isAnonymous": false,
        "isPublic": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "sender": {
          "id": "507f1f77bcf86cd799439013",
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "isVerified": true
        },
        "receiver": {
          "id": "507f1f77bcf86cd799439011",
          "username": "jane_doe",
          "displayName": "Jane Doe",
          "avatar": "https://example.com/avatar2.jpg",
          "isVerified": false
        },
        "stream": {
          "id": "507f1f77bcf86cd799439014",
          "title": "Canlı Yayın",
          "streamerId": "507f1f77bcf86cd799439011"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### 3. En Çok Hediye Göndericiler
**GET** `/api/social/gifts/top-gifters?period=monthly&limit=10`

**Query Parameters:**
- `period` (string, default: "monthly"): `daily`, `weekly`, `monthly`, `yearly`
- `limit` (integer, default: 10, max: 100): Sonuç sayısı

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439013",
      "totalCoins": 15000,
      "giftCount": 150,
      "rank": 1,
      "user": {
        "id": "507f1f77bcf86cd799439013",
        "username": "john_doe",
        "displayName": "John Doe",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  ]
}
```

### 4. En Çok Hediye Alıcılar
**GET** `/api/social/gifts/top-receivers?period=monthly&limit=10`

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "totalCoins": 25000,
      "giftCount": 200,
      "rank": 1,
      "user": {
        "id": "507f1f77bcf86cd799439011",
        "username": "jane_doe",
        "displayName": "Jane Doe",
        "avatar": "https://example.com/avatar2.jpg"
      }
    }
  ]
}
```

---

## 💬 Yorum Sistemi (Comment System)

### 1. Yorum Oluştur
**POST** `/api/social/comments`

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
  "streamId": "507f1f77bcf86cd799439014",
  "content": "Harika yayın! 👏",
  "type": "text",
  "parentCommentId": "507f1f77bcf86cd799439016",
  "metadata": {
    "emojis": ["👏", "🔥"],
    "mentions": ["507f1f77bcf86cd799439011"],
    "hashtags": ["gaming", "live"]
  }
}
```

**Comment Types:**
- `text`: Metin yorumu
- `emoji`: Emoji yorumu
- `sticker`: Sticker yorumu
- `gif`: GIF yorumu

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Yorum başarıyla oluşturuldu",
  "data": {
    "id": "507f1f77bcf86cd799439017",
    "streamId": "507f1f77bcf86cd799439014",
    "authorId": "507f1f77bcf86cd799439013",
    "content": "Harika yayın! 👏",
    "type": "TEXT",
    "parentCommentId": "507f1f77bcf86cd799439016",
    "metadata": {
      "emojis": ["👏", "🔥"],
      "mentions": ["507f1f77bcf86cd799439011"],
      "hashtags": ["gaming", "live"]
    },
    "isModerated": false,
    "isPinned": false,
    "isHidden": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Yayın Yorumlarını Getir
**GET** `/api/social/comments/stream/{streamId}?page=1&limit=50&sortBy=newest&includeReplies=true`

**Query Parameters:**
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 50, max: 100): Sayfa başına öğe sayısı
- `sortBy` (string, default: "newest"): `newest`, `oldest`, `popular`
- `includeReplies` (boolean, default: true): Cevapları dahil et

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "507f1f77bcf86cd799439017",
        "streamId": "507f1f77bcf86cd799439014",
        "authorId": "507f1f77bcf86cd799439013",
        "content": "Harika yayın! 👏",
        "type": "TEXT",
        "parentCommentId": null,
        "metadata": {
          "emojis": ["👏", "🔥"],
          "mentions": ["507f1f77bcf86cd799439011"],
          "hashtags": ["gaming", "live"]
        },
        "isModerated": false,
        "isPinned": false,
        "isHidden": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "author": {
          "id": "507f1f77bcf86cd799439013",
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "isVerified": true
        },
        "replies": [
          {
            "id": "507f1f77bcf86cd799439018",
            "content": "Katılıyorum!",
            "authorId": "507f1f77bcf86cd799439019",
            "createdAt": "2024-01-15T10:35:00.000Z",
            "author": {
              "id": "507f1f77bcf86cd799439019",
              "username": "alice_smith",
              "displayName": "Alice Smith",
              "avatar": "https://example.com/avatar3.jpg",
              "isVerified": false
            }
          }
        ],
        "_count": {
          "replies": 1,
          "reactions": 5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 120,
      "pages": 3
    }
  }
}
```

### 3. Yorum Güncelle
**PUT** `/api/social/comments/{commentId}`

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
  "content": "Güncellenmiş yorum içeriği"
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yorum başarıyla güncellendi",
  "data": {
    "id": "507f1f77bcf86cd799439017",
    "content": "Güncellenmiş yorum içeriği",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### 4. Yorum Sil
**DELETE** `/api/social/comments/{commentId}`

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
  "message": "Yorum başarıyla silindi"
}
```

### 5. Yorum Moderasyonu
**POST** `/api/social/comments/{commentId}/moderate`

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
  "action": "pin",
  "reason": "Önemli yorum"
}
```

**Action Options:**
- `pin`: Sabitle
- `unpin`: Sabitlemeden çıkar
- `hide`: Gizle
- `unhide`: Göster
- `delete`: Sil
- `approve`: Onayla
- `flag`: İşaretle

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Yorum başarıyla modere edildi"
}
```

### 6. Yorum Şikayet Et
**POST** `/api/social/comments/{commentId}/report`

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
  "reason": "spam",
  "description": "Bu yorum spam içeriği barındırıyor"
}
```

**Reason Options:**
- `spam`: Spam
- `harassment`: Taciz
- `hate_speech`: Nefret söylemi
- `violence`: Şiddet
- `nudity`: Çıplaklık
- `misinformation`: Yanlış bilgi
- `copyright`: Telif hakkı ihlali
- `impersonation`: Kimlik hırsızlığı
- `other`: Diğer

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Şikayet başarıyla gönderildi"
}
```

---

## 😍 Tepki Sistemi (Reaction System)

### 1. Tepki Ekle
**POST** `/api/social/reactions`

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
  "targetId": "507f1f77bcf86cd799439014",
  "targetType": "stream",
  "reactionType": "love",
  "intensity": 4,
  "position": {
    "x": 50,
    "y": 30
  },
  "isAnonymous": false,
  "duration": 3000
}
```

**Target Types:**
- `stream`: Yayın
- `comment`: Yorum
- `user`: Kullanıcı
- `gift`: Hediye

**Reaction Types:**
- `like`, `love`, `laugh`, `wow`, `sad`, `angry`
- `fire`, `heart_eyes`, `clap`, `thumbs_up`, `thumbs_down`
- `party`, `mind_blown`, `crying_laughing`, `heart_fire`
- `wave`, `peace`, `ok_hand`, `muscle`, `pray`
- `fireworks`, `confetti`, `sparkles`, `rainbow`, `lightning`
- `custom`: Özel emoji için

**Custom Emoji Request (reactionType: "custom"):**
```json
{
  "targetId": "507f1f77bcf86cd799439014",
  "targetType": "stream",
  "reactionType": "custom",
  "customEmoji": {
    "name": "custom_heart",
    "url": "https://example.com/emoji.gif",
    "animated": true
  },
  "intensity": 5,
  "position": {
    "x": 75,
    "y": 45
  }
}
```

**Response (201 - Yeni tepki / 200 - Güncellenen tepki):**
```json
{
  "success": true,
  "message": "Tepki başarıyla eklendi",
  "data": {
    "id": "507f1f77bcf86cd799439020",
    "userId": "507f1f77bcf86cd799439013",
    "targetId": "507f1f77bcf86cd799439014",
    "targetType": "stream",
    "reactionType": "love",
    "intensity": 4,
    "position": {
      "x": 50,
      "y": 30
    },
    "isAnonymous": false,
    "duration": 3000,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Tepki Kaldır
**DELETE** `/api/social/reactions/{targetType}/{targetId}`

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
  "message": "Tepki başarıyla kaldırıldı"
}
```

### 3. Tepkileri Getir
**GET** `/api/social/reactions/{targetType}/{targetId}?page=1&limit=50&reactionType=love&startDate=2024-01-01&endDate=2024-01-31`

**Query Parameters:**
- `page` (integer, default: 1): Sayfa numarası
- `limit` (integer, default: 50, max: 100): Sayfa başına öğe sayısı
- `reactionType` (string, optional): Tepki türü filtresi
- `startDate` (date, optional): Başlangıç tarihi
- `endDate` (date, optional): Bitiş tarihi

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "id": "507f1f77bcf86cd799439020",
        "userId": "507f1f77bcf86cd799439013",
        "targetId": "507f1f77bcf86cd799439014",
        "targetType": "stream",
        "reactionType": "love",
        "intensity": 4,
        "position": {
          "x": 50,
          "y": 30
        },
        "isAnonymous": false,
        "duration": 3000,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "user": {
          "id": "507f1f77bcf86cd799439013",
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://example.com/avatar.jpg",
          "isVerified": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 250,
      "pages": 5
    }
  }
}
```

### 4. Tepki İstatistikleri
**GET** `/api/social/reactions/{targetType}/{targetId}/stats?period=daily`

**Query Parameters:**
- `period` (string, default: "daily"): `hourly`, `daily`, `weekly`, `monthly`

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "totalReactions": 1250,
    "reactionBreakdown": {
      "love": 450,
      "like": 320,
      "fire": 180,
      "clap": 150,
      "wow": 100,
      "laugh": 50
    },
    "averageIntensity": 3.2,
    "topReactionType": "love",
    "period": "daily",
    "periodStart": "2024-01-15T00:00:00.000Z",
    "periodEnd": "2024-01-15T23:59:59.999Z"
  }
}
```

### 5. Canlı Tepkiler
**GET** `/api/social/reactions/{targetType}/{targetId}/live?lastTimestamp=2024-01-15T10:30:00.000Z`

**Query Parameters:**
- `lastTimestamp` (datetime, optional): Son zaman damgası

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "id": "507f1f77bcf86cd799439021",
        "userId": "507f1f77bcf86cd799439013",
        "reactionType": "fire",
        "intensity": 5,
        "position": {
          "x": 80,
          "y": 20
        },
        "duration": 2000,
        "createdAt": "2024-01-15T10:31:00.000Z",
        "user": {
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        }
      }
    ],
    "lastTimestamp": "2024-01-15T10:31:00.000Z",
    "hasMore": true
  }
}
```

---

## 🔧 Genel Error Responses

### Yaygın Hata Kodları

**400 - Bad Request:**
```json
{
  "success": false,
  "message": "Geçersiz istek parametreleri",
  "errors": [
    {
      "field": "userId",
      "message": "Geçersiz kullanıcı ID formatı"
    }
  ]
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Kimlik doğrulaması gerekli"
}
```

**403 - Forbidden:**
```json
{
  "success": false,
  "message": "Bu işlem için yetkiniz bulunmuyor"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Kaynak bulunamadı"
}
```

**429 - Too Many Requests:**
```json
{
  "success": false,
  "message": "Çok fazla istek gönderildi, lütfen bekleyin",
  "retryAfter": 60
}
```

**500 - Internal Server Error:**
```json
{
  "success": false,
  "message": "Sunucu hatası oluştu"
}
```

---

## 📝 Notlar

1. **Authentication**: Tüm POST, PUT, DELETE işlemleri için Bearer token gereklidir.
2. **Rate Limiting**: API'de rate limiting uygulanmaktadır.
3. **Pagination**: Tüm liste endpoint'leri sayfalama destekler.
4. **Validation**: Tüm input'lar Joi ile validate edilir.
5. **MongoDB ObjectId**: Tüm ID'ler 24 karakterlik hexadecimal string formatındadır.
6. **Timestamps**: Tüm tarihler ISO 8601 formatında UTC timezone'da döner.
7. **File Uploads**: Avatar ve medya dosyaları için ayrı upload endpoint'leri kullanılır.

Bu dokümantasyon, sosyal modülünün tüm endpoint'lerini kapsamaktadır. Her endpoint için detaylı request/response örnekleri ve hata durumları belirtilmiştir.