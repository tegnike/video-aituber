import { NextRequest, NextResponse } from 'next/server';
import { getStartupConfig, getPresetId } from '@/lib/videoGenerationConfig';

export async function GET(request: NextRequest) {
  try {
    const startupConfig = getStartupConfig();

    // スタートアップが無効または設定がない場合
    if (!startupConfig || startupConfig.requests.length === 0) {
      return NextResponse.json({
        enabled: false,
        videoPaths: [],
      });
    }

    // generate-video APIを呼び出してスタートアップ動画を生成
    const generateVideoUrl = `${request.nextUrl.origin}/api/generate-video`;
    const response = await fetch(generateVideoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: startupConfig.requests,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate startup videos');
    }

    const data = await response.json();

    // resultsからvideoUrlを抽出
    const videoPaths = (data.results || [])
      .map((r: { videoUrl?: string }) => r.videoUrl)
      .filter((url: string | undefined): url is string => !!url);

    return NextResponse.json({
      enabled: true,
      videoPaths,
    });
  } catch (error) {
    console.error('Error in startup-video API:', error);
    return NextResponse.json({
      enabled: false,
      videoPaths: [],
      error: 'Failed to fetch startup videos',
    });
  }
}
