# Chat Endpoints Documentation

Bu dosya, chat modülünün tüm endpoint'lerini, request ve response JSON verilerini içermektedir.

## 📋 İçindekiler

1. [Mesaj Yönetimi (Message Management)](#mesaj-yönetimi-message-management)
2. [Mesaj İşlemleri (Message Operations)](#mesaj-işlemleri-message-operations)

---

## 💬 Mesaj Yönetimi (Message Management)

### 1. Mesaj Gönder
**POST** `/api/chat/messages`

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
  "streamId": "c507f1f77bcf86cd799439011",
  "content": "Harika bir yayın! 🔥",
  "type": "TEXT",
  "metadata": {
    "mentions": ["c507f1f77bcf86cd799439012"],
    "replyTo": "c507f1f77bcf86cd799439013",
    "emotes": ["fire", "heart"]
  }
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Mesaj başarıyla gönderildi",
  "data": {
    "message": {
      "id": "c507f1f77bcf86cd799439014",
      "streamId": "c507f1f77bcf86cd799439011",
      "senderId": "c507f1f77bcf86cd799439015",
      "content": "Harika bir yayın! 🔥",
      "type": "TEXT",
      "metadata": {
        "mentions": ["c507f1f77bcf86cd799439012"],
        "replyTo": "c507f1f77bcf86cd799439013",
        "emotes": ["fire", "heart"]
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "sender": {
        "id": "c507f1f77bcf86cd799439015",
        "username": "izleyici123",
        "displayName": "İzleyici 123",
        "avatar": "https://example.com/avatar.jpg",
        "badges": ["subscriber", "vip"],
        "level": 15
      }
    }
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Stream bulunamadı",
  "error": "STREAM_NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "Bu stream'de mesaj gönderme izniniz yok",
  "error": "CHAT_PERMISSION_DENIED",
  "details": {
    "reason": "FOLLOW_REQUIRED"
  }
}
```

### 2. Mesajları Getir
**GET** `/api/chat/{streamId}/messages`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Path Parameters:**
- `streamId` (string, required): Stream ID'si

**Query Parameters:**
- `page` (number, optional): Sayfa numarası (varsayılan: 1)
- `limit` (number, optional): Sayfa başına mesaj sayısı (varsayılan: 50, maksimum: 200)
- `sortBy` (string, optional): Sıralama türü (`newest`, `oldest`) (varsayılan: `newest`)
- `type` (string, optional): Mesaj türü filtresi (`TEXT`, `EMOJI`, `STICKER`, `GIF`)
- `includeDeleted` (boolean, optional): Silinmiş mesajları dahil et (varsayılan: false)

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "c507f1f77bcf86cd799439014",
        "streamId": "c507f1f77bcf86cd799439011",
        "senderId": "c507f1f77bcf86cd799439015",
        "content": "Harika bir yayın! 🔥",
        "type": "TEXT",
        "metadata": {
          "mentions": ["c507f1f77bcf86cd799439012"],
          "replyTo": "c507f1f77bcf86cd799439013",
          "emotes": ["fire", "heart"]
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "sender": {
          "id": "c507f1f77bcf86cd799439015",
          "username": "izleyici123",
          "displayName": "İzleyici 123",
          "avatar": "https://example.com/avatar.jpg",
          "badges": ["subscriber", "vip"],
          "level": 15
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "streamInfo": {
      "id": "c507f1f77bcf86cd799439011",
      "title": "Canlı Yayın",
      "chatSettings": {
        "allowComments": true,
        "requireFollowToChat": false,
        "slowModeDelay": 0,
        "subscriberOnlyMode": false
      }
    }
  }
}
```

---

## ⚙️ Mesaj İşlemleri (Message Operations)

### 1. Mesaj Güncelle
**PUT** `/api/chat/messages/{messageId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Path Parameters:**
- `messageId` (string, required): Mesaj ID'si

**Request Body:**
```json
{
  "content": "Düzenlenmiş mesaj içeriği 📝",
  "metadata": {
    "edited": true,
    "editReason": "Yazım hatası düzeltildi"
  }
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Mesaj başarıyla güncellendi",
  "data": {
    "message": {
      "id": "c507f1f77bcf86cd799439014",
      "streamId": "c507f1f77bcf86cd799439011",
      "senderId": "c507f1f77bcf86cd799439015",
      "content": "Düzenlenmiş mesaj içeriği 📝",
      "type": "TEXT",
      "metadata": {
        "edited": true,
        "editReason": "Yazım hatası düzeltildi",
        "editedAt": "2024-01-15T10:35:00.000Z"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "sender": {
        "id": "c507f1f77bcf86cd799439015",
        "username": "izleyici123",
        "displayName": "İzleyici 123",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  }
}
```

### 2. Mesaj Sil
**DELETE** `/api/chat/messages/{messageId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Path Parameters:**
- `messageId` (string, required): Mesaj ID'si

**Request Body (Optional):**
```json
{
  "reason": "Uygunsuz içerik"
}
```

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Mesaj başarıyla silindi",
  "data": {
    "messageId": "c507f1f77bcf86cd799439014",
    "deletedAt": "2024-01-15T10:40:00.000Z",
    "deletedBy": "c507f1f77bcf86cd799439015",
    "reason": "Uygunsuz içerik"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Mesaj bulunamadı",
  "error": "MESSAGE_NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "Bu mesajı silme yetkiniz yok",
  "error": "INSUFFICIENT_PERMISSIONS"
}
```

---

## 🔧 Genel Bilgiler

### Kimlik Doğrulama
Tüm endpoint'ler Bearer token ile kimlik doğrulama gerektirir: