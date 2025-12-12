/**
 * 従来の動画キュー（sessionIdなしの後方互換性用）
 */

interface LegacyVideoEntry {
  path: string;
  timestamp: number;
}

const legacyVideoQueue: Map<string, LegacyVideoEntry> = new Map();

export function getLegacyVideoQueue(): Map<string, LegacyVideoEntry> {
  return legacyVideoQueue;
}

export function addToLegacyQueue(id: string, path: string): void {
  legacyVideoQueue.set(id, {
    path,
    timestamp: Date.now(),
  });
}

export function getFromLegacyQueue(): { id: string; path: string } | null {
  const iterator = legacyVideoQueue.entries().next();
  if (iterator.done) {
    return null;
  }

  const [id, value] = iterator.value;
  legacyVideoQueue.delete(id);
  return { id, path: value.path };
}

export function cleanupOldLegacyEntries(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of legacyVideoQueue.entries()) {
    if (value.timestamp < oneHourAgo) {
      legacyVideoQueue.delete(key);
    }
  }
}

// テスト用: キューをリセット
export function resetLegacyQueue(): void {
  legacyVideoQueue.clear();
}
