// Simple in-memory presence tracking for online users
// Note: This resets on server restart. For production, use a shared store like Redis.

const connectionCounts = new Map<string, number>();

export function setOnline(userId: string): void {
  const current = connectionCounts.get(userId) ?? 0;
  connectionCounts.set(userId, current + 1);
}

export function setOffline(userId: string): void {
  const current = connectionCounts.get(userId) ?? 0;
  if (current <= 1) {
    connectionCounts.delete(userId);
  } else {
    connectionCounts.set(userId, current - 1);
  }
}

export function isOnline(userId: string): boolean {
  return connectionCounts.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(connectionCounts.keys());
}