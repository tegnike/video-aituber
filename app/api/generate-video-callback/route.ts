import { NextRequest, NextResponse } from 'next/server';

// 動画生成の状態を管理するための簡易的なストア
const videoQueue: Map<string, { path: string; timestamp: number }> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { videoPath } = await request.json();

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // 動画パスをキューに追加（API経由でアクセスできるURLに変換）
    const id = Date.now().toString();
    // 動画ファイルへのアクセスは /api/video?path=... 経由で行う
    const videoUrl = `/api/video?path=${encodeURIComponent(videoPath)}`;
    videoQueue.set(id, {
      path: videoUrl,
      timestamp: Date.now(),
    });

    // 古いエントリを削除（1時間以上前のもの）
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of videoQueue.entries()) {
      if (value.timestamp < oneHourAgo) {
        videoQueue.delete(key);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error in video callback API:', error);
    return NextResponse.json(
      { error: 'Failed to process video callback' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // まだクライアントに渡していない最古の動画パスを取得し、キューから取り除く
    const iterator = videoQueue.entries().next();
    if (iterator.done) {
      return NextResponse.json({ videoPath: null });
    }

    const [id, value] = iterator.value;
    videoQueue.delete(id);

    return NextResponse.json({ videoPath: value.path });
  } catch (error) {
    console.error('Error getting video status:', error);
    return NextResponse.json(
      { error: 'Failed to get video status' },
      { status: 500 }
    );
  }
}
