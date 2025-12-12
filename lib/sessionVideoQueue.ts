/**
 * セッション別動画キュー管理モジュール
 * 動画生成コールバックの順序保証を実現する
 */

export interface VideoEntry {
  path: string;
  sequence: number;
  timestamp: number;
}

export interface SessionVideoQueue {
  sessionId: string;
  videos: Map<number, VideoEntry>; // sequence -> VideoEntry
  nextExpectedSequence: number;
  totalExpectedCount: number;
  createdAt: number;
}

export interface AddVideoParams {
  sessionId: string;
  sequence: number;
  videoPath: string;
  totalCount: number;
}

export interface GetNextVideoResult {
  videoPath: string | null;
  sessionId?: string;
  sequence?: number;
  isComplete?: boolean;
}

export interface SessionInfo {
  videoCount: number;
  nextExpectedSequence: number;
  totalExpectedCount: number;
}

// セッション別キュー
const sessionQueues: Map<string, SessionVideoQueue> = new Map();

// クリーンアップの閾値（1時間）
const CLEANUP_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * セッションに動画を追加する
 */
export function addVideoToSession(params: AddVideoParams): void {
  const { sessionId, sequence, videoPath, totalCount } = params;

  let queue = sessionQueues.get(sessionId);
  if (!queue) {
    queue = {
      sessionId,
      videos: new Map(),
      nextExpectedSequence: 0,
      totalExpectedCount: totalCount,
      createdAt: Date.now(),
    };
    sessionQueues.set(sessionId, queue);
  }

  queue.videos.set(sequence, {
    path: videoPath,
    sequence,
    timestamp: Date.now(),
  });
}

/**
 * 次のシーケンス番号の動画を取得して削除する
 */
export function getNextVideo(sessionId: string): GetNextVideoResult {
  const queue = sessionQueues.get(sessionId);
  if (!queue) {
    return { videoPath: null };
  }

  const nextSequence = queue.nextExpectedSequence;
  const video = queue.videos.get(nextSequence);

  if (!video) {
    // 次のシーケンスがまだ到着していない
    return { videoPath: null };
  }

  // 動画を取り出して削除
  queue.videos.delete(nextSequence);
  queue.nextExpectedSequence = nextSequence + 1;

  // 全ての動画を取得完了したかチェック
  const isComplete = queue.nextExpectedSequence >= queue.totalExpectedCount;

  // 完了したセッションは削除
  if (isComplete) {
    sessionQueues.delete(sessionId);
  }

  return {
    videoPath: video.path,
    sessionId,
    sequence: video.sequence,
    isComplete,
  };
}

/**
 * 古いセッションをクリーンアップする
 */
export function cleanupOldSessions(): void {
  const now = Date.now();
  const threshold = now - CLEANUP_THRESHOLD_MS;

  for (const [sessionId, queue] of sessionQueues.entries()) {
    if (queue.createdAt < threshold) {
      sessionQueues.delete(sessionId);
    }
  }
}

/**
 * 全てのセッションをリセット（テスト用）
 */
export function resetSessionQueues(): void {
  sessionQueues.clear();
}

/**
 * セッション情報を取得（デバッグ・テスト用）
 */
export function getSessionInfo(sessionId: string): SessionInfo | null {
  const queue = sessionQueues.get(sessionId);
  if (!queue) {
    return null;
  }

  return {
    videoCount: queue.videos.size,
    nextExpectedSequence: queue.nextExpectedSequence,
    totalExpectedCount: queue.totalExpectedCount,
  };
}
