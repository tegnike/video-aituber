import { NextRequest, NextResponse } from 'next/server';
import {
  addVideoToSession,
  getNextVideo,
  cleanupOldSessions,
} from '@/lib/sessionVideoQueue';
import {
  addToLegacyQueue,
  getFromLegacyQueue,
  cleanupOldLegacyEntries,
} from '@/lib/legacyVideoQueue';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, sessionId, sequence, totalCount } = await request.json();

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // 動画ファイルへのアクセスは /api/video?path=... 経由で行う
    const videoUrl = `/api/video?path=${encodeURIComponent(videoPath)}`;

    // セッションIDがある場合はセッション別キューに格納
    if (sessionId !== undefined && sequence !== undefined && totalCount !== undefined) {
      addVideoToSession({
        sessionId,
        sequence,
        videoPath: videoUrl,
        totalCount,
      });
    } else {
      // 従来の動作（後方互換性）
      const id = Date.now().toString();
      addToLegacyQueue(id, videoUrl);
    }

    // 古いエントリ・セッションを削除（1時間以上前のもの）
    cleanupOldLegacyEntries();
    cleanupOldSessions();

    const id = Date.now().toString();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in video callback API:', error);
    return NextResponse.json(
      { error: 'Failed to process video callback' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    // セッションIDがある場合はセッション別キューから取得
    if (sessionId) {
      const result = getNextVideo(sessionId);
      return NextResponse.json({
        videoPath: result.videoPath,
        sessionId: result.sessionId,
        sequence: result.sequence,
        isComplete: result.isComplete,
      });
    }

    // 従来の動作（後方互換性）
    const entry = getFromLegacyQueue();
    if (!entry) {
      return NextResponse.json({ videoPath: null });
    }

    return NextResponse.json({ videoPath: entry.path });
  } catch (error) {
    console.error('Error getting video status:', error);
    return NextResponse.json(
      { error: 'Failed to get video status' },
      { status: 500 }
    );
  }
}
