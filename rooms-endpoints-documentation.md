# Rooms Endpoints Documentation

Bu dosya, rooms modülünün tüm endpoint'lerini, request ve response JSON verilerini içermektedir.

## 📋 İçindekiler

1. [Oda Yönetimi (Room Management)](#oda-yönetimi-room-management)
2. [Üye Yönetimi (Member Management)](#üye-yönetimi-member-management)
3. [Oda Mesajları (Room Messages)](#oda-mesajları-room-messages)

---

## 🏠 Oda Yönetimi (Room Management)

### 1. Oda Oluştur
**POST** `/api/rooms`

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
  "name": "Genel Sohbet",
  "description": "Herkesin katılabileceği genel sohbet odası",
  "visibility": "PUBLIC",
  "settings": {
    "allowInvites": true,
    "maxMembers": 100,
    "requireApproval": false
  },
  "metadata": {
    "category": "general",
    "tags": ["sohbet", "genel"]
  }
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Oda başarıyla oluşturuldu",
  "data": {
    "room": {
      "id": "c507f1f77bcf86cd799439011",
      "name": "Genel Sohbet",
      "description": "Herkesin katılabileceği genel sohbet odası",
      "visibility": "PUBLIC",
      "ownerId": "c507f1f77bcf86cd799439012",
      "memberCount": 1,
      "settings": {
        "allowInvites": true,
        "maxMembers": 100,
        "requireApproval": false
      },
      "metadata": {
        "category": "general",
        "tags": ["sohbet", "genel"]
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Oda adı gereklidir",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "name",
    "code": "REQUIRED"
  }
}
```

---

## 👥 Üye Yönetimi (Member Management)

### 1. Odaya Üye Ekle
**POST** `/api/rooms/{roomId}/members`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Path Parameters:**
- `roomId` (string, required): Oda ID'si

**Request Body:**
```json
{
  "userId": "c507f1f77bcf86cd799439013",
  "role": "MEMBER"
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Üye başarıyla eklendi",
  "data": {
    "member": {
      "id": "c507f1f77bcf86cd799439014",
      "roomId": "c507f1f77bcf86cd799439011",
      "userId": "c507f1f77bcf86cd799439013",
      "role": "MEMBER",
      "joinedAt": "2024-01-15T10:35:00.000Z",
      "user": {
        "id": "c507f1f77bcf86cd799439013",
        "username": "kullanici123",
        "displayName": "Kullanıcı 123",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  }
}
```

### 2. Odadan Üye Çıkar
**DELETE** `/api/rooms/{roomId}/members/{userId}`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Path Parameters:**
- `roomId` (string, required): Oda ID'si
- `userId` (string, required): Kullanıcı ID'si

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "message": "Üye başarıyla çıkarıldı"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Üye bulunamadı",
  "error": "MEMBER_NOT_FOUND"
}
```

---

## 💬 Oda Mesajları (Room Messages)

### 1. Oda Mesajı Gönder
**POST** `/api/rooms/{roomId}/messages`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Path Parameters:**
- `roomId` (string, required): Oda ID'si

**Request Body:**
```json
{
  "content": "Merhaba herkese! 👋",
  "type": "TEXT",
  "metadata": {
    "mentions": ["c507f1f77bcf86cd799439013"],
    "replyTo": "c507f1f77bcf86cd799439015"
  },
  "attachments": {
    "images": ["https://example.com/image.jpg"],
    "files": []
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
      "id": "c507f1f77bcf86cd799439016",
      "roomId": "c507f1f77bcf86cd799439011",
      "senderId": "c507f1f77bcf86cd799439012",
      "content": "Merhaba herkese! 👋",
      "type": "TEXT",
      "metadata": {
        "mentions": ["c507f1f77bcf86cd799439013"],
        "replyTo": "c507f1f77bcf86cd799439015"
      },
      "attachments": {
        "images": ["https://example.com/image.jpg"],
        "files": []
      },
      "createdAt": "2024-01-15T10:40:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z",
      "sender": {
        "id": "c507f1f77bcf86cd799439012",
        "username": "oda_sahibi",
        "displayName": "Oda Sahibi",
        "avatar": "https://example.com/owner-avatar.jpg"
      }
    }
  }
}
```

### 2. Oda Mesajlarını Getir
**GET** `/api/rooms/{roomId}/messages`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Path Parameters:**
- `roomId` (string, required): Oda ID'si

**Query Parameters:**
- `page` (number, optional): Sayfa numarası (varsayılan: 1)
- `limit` (number, optional): Sayfa başına mesaj sayısı (varsayılan: 50, maksimum: 100)
- `sortBy` (string, optional): Sıralama türü (`newest`, `oldest`) (varsayılan: `newest`)
- `includeDeleted` (boolean, optional): Silinmiş mesajları dahil et (varsayılan: false)
- `type` (string, optional): Mesaj türü filtresi (`TEXT`, `IMAGE`, `VIDEO`, `STICKER`, `GIF`, `SYSTEM`)

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "c507f1f77bcf86cd799439016",
        "roomId": "c507f1f77bcf86cd799439011",
        "senderId": "c507f1f77bcf86cd799439012",
        "content": "Merhaba herkese! 👋",
        "type": "TEXT",
        "metadata": {
          "mentions": ["c507f1f77bcf86cd799439013"],
          "replyTo": "c507f1f77bcf86cd799439015"
        },
        "attachments": {
          "images": ["https://example.com/image.jpg"],
          "files": []
        },
        "createdAt": "2024-01-15T10:40:00.000Z",
        "updatedAt": "2024-01-15T10:40:00.000Z",
        "sender": {
          "id": "c507f1f77bcf86cd799439012",
          "username": "oda_sahibi",
          "displayName": "Oda Sahibi",
          "avatar": "https://example.com/owner-avatar.jpg"
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
    }
  }
}
```

---

## 🔧 Genel Bilgiler

### Kimlik Doğrulama
Tüm endpoint'ler Bearer token ile kimlik doğrulama gerektirir:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Geçersiz veya eksik token"
}
```