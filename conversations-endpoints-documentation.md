# Conversations Endpoints Documentation

Bu dosya, konuşmalar (conversations) modülünün tüm endpoint'lerini, request ve response JSON verilerini içermektedir.

## 📋 İçindekiler

1. [Konuşma Yönetimi (Conversation Management)](#konuşma-yönetimi-conversation-management)
2. [Katılımcı Yönetimi (Participant Management)](#katılımcı-yönetimi-participant-management)
3. [Mesaj Sistemi (Message System)](#mesaj-sistemi-message-system)
4. [Konuşma Durumu (Conversation Status)](#konuşma-durumu-conversation-status)

---

## 💬 Konuşma Yönetimi (Conversation Management)

### 1. Konuşma Oluştur
**POST** `/api/conversations`

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
  "type": "group",
  "name": "Proje Ekibi",
  "description": "Yeni proje için ekip konuşması",
  "participants": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ],
  "settings": {
    "isPrivate": false,
    "allowInvites": true,
    "requireApproval": false,
    "muteNotifications": false
  },
  "metadata": {
    "avatar": "https://example.com/avatars/group123.jpg",
    "color": "#4A90E2"
  }
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Konuşma başarıyla oluşturuldu",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "type": "group",
    "name": "Proje Ekibi",
    "description": "Yeni proje için ekip konuşması",
    "creatorId": "507f1f77bcf86cd799439015",
    "participantCount": 4,
    "settings": {
      "isPrivate": false,
      "allowInvites": true,
      "requireApproval": false,
      "muteNotifications": false
    },
    "metadata": {
      "avatar": "https://example.com/avatars/group123.jpg",
      "color": "#4A90E2"
    },
    "lastMessage": null,
    "lastActivity": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Konuşma Tipleri:**
- `direct`: İki kişi arasında direkt mesajlaşma
- `group`: Grup konuşması (3+ kişi)

### 2. Konuşmaları Listele
**GET** `/api/conversations`

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}"
}
```

**Query Parameters:**
- `type` (string, optional): Konuşma tipi filtresi
- `search` (string, optional): Konuşma adında arama
- `page` (number, optional): Sayfa numarası (varsayılan: 1)
- `limit` (number, optional): Sayfa başına sonuç sayısı (varsayılan: 20, max: 50)
- `sortBy` (string, optional): Sıralama (lastActivity, name, created)
- `sortOrder` (string, optional): Sıralama yönü (asc, desc)

**Response (200 - Başarılı):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "group",
        "name": "Proje Ekibi",
        "description": "Yeni proje için ekip konuşması",
        "participantCount": 4,
        "unreadCount": 3,
        "lastMessage": {
          "id": "507f1f77bcf86cd799439016",
          "content": "Toplantı yarın saat 14:00'te",
          "type": "text",
          "senderId": "507f1f77bcf86cd799439012",
          "senderName": "Ahmet Yılmaz",
          "createdAt": "2024-01-15T15:30:00.000Z"
        },
        "lastActivity": "2024-01-15T15:30:00.000Z",
        "metadata": {
          "avatar": "https://example.com/avatars/group123.jpg",
          "color": "#4A90E2"
        },
        "isRead": false,
        "isMuted": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## 👥 Katılımcı Yönetimi (Participant Management)

### 1. Katılımcı Ekle
**POST** `/api/conversations/{conversationId}/participants`

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
  "userId": "507f1f77bcf86cd799439017",
  "role": "member"
}
```

**Response (201 - Başarılı):**
```json
{
  "success": true,
  "message": "Katılımcı başarıyla eklendi",
  "data": {
    "id": "507f1f77bcf86cd799439018",
    "conversationId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439017",
    "role": "member",
    "joinedAt": "2024-01-15T10:35:00.000Z",
    "user": {
      "id": "507f1f77bcf86cd799439017",
      "username": "yeniuye123",
      "displayName": "Yeni Üye",
      "avatar": "https://example.com/avatars/newuser.jpg",
      "isOnline": true,
      "lastSeen": "2024-01-15T10:34:00.000Z"
    }
  }
}
```

**Katılımcı Rolleri:**
- `admin`: Yönetici (konuşmayı yönetebilir)
- `moderator`: Moderatör (mesajları yönetebilir)
- `member`: Üye (normal katılımcı)

### 2. Katılımcı Çıkar
**DELETE** `/api/conversations/{conversationId}/participants/{userId}`

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
  "message": "Katılımcı başarıyla çıkarıldı"
}
```

---

## 💬