import { NextRequest, NextResponse } from 'next/server';
import { getPresetId, getLoopActions } from '@/lib/videoGenerationConfig';
import { addLoopVideoPath } from '@/lib/loopVideoStore';

export interface VideoRequest {
  action: string;
  params: Record<string, unknown>;
}

export interface GenerateVideoResponse {
  success: boolean;
  results?: Array<{
    action: string;
    outputPath?: string;
    videoUrl?: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { requests, sessionId, sequence, totalCount } = await request.json();

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'requests array is required' },
        { status: 400 }
      );
    }

    // staticVideoアクションを分離
    const staticVideoRequests = requests.filter(
      (r: VideoRequest) => r.action === 'staticVideo'
    );
    const serverRequests = requests.filter(
      (r: VideoRequest) => r.action !== 'staticVideo'
    );

    // staticVideo用の結果を先に追加
    const results: Array<{
      action: string;
      outputPath?: string;
      videoUrl?: string;
    }> = [];

    for (const req of staticVideoRequests) {
      const path = req.params.path as string;
      if (path) {
        const videoUrl =
          path.startsWith('/api/') || path.startsWith('http')
            ? path
            : `/api/video?path=${encodeURIComponent(path)}`;
        results.push({
          action: 'staticVideo',
          outputPath: path,
          videoUrl,
        });
      }
    }

    // 動画生成サーバーに送るリクエストがない場合は早期リターン
    if (serverRequests.length === 0) {
      return NextResponse.json({
        success: true,
        results,
      });
    }

    const videoGenerationUrl =
      process.env.VIDEO_GENERATION_API_URL ||
      'http://localhost:4000/api/generate';

    const requestBody = {
      presetId: getPresetId(),
      stream: true,
      requests: serverRequests,
    };

    console.log('Sending request to video generation API:');
    console.log('URL:', videoGenerationUrl);
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(videoGenerationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to fetch video generation API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          if (data.type === 'done') {
            console.log(`Video generation completed: ${data.count} videos generated`);
            break;
          }

          if (data.type === 'result' && data.result) {
            const result = data.result;

            // ループ動画（loopActionsに含まれるアクション）の場合は共有ストアに保存
            const loopActions = getLoopActions();
            if (loopActions.includes(result.action)) {
              const loopPath =
                result.params?.path ||
                result.params?.loopVideoPath ||
                result.outputPath;

              if (typeof loopPath === 'string' && loopPath.length > 0) {
                const loopVideoUrl =
                  loopPath.startsWith('/api/') || loopPath.startsWith('http')
                    ? loopPath
                    : `/api/video?path=${encodeURIComponent(loopPath)}`;
                addLoopVideoPath(loopVideoUrl);
                results.push({
                  action: result.action,
                  outputPath: loopPath,
                  videoUrl: loopVideoUrl,
                });
              }
              continue;
            }

            // 通常の動画の場合
            if (result.outputPath) {
              const videoUrl = `/api/video?path=${encodeURIComponent(result.outputPath)}`;

              // コールバックAPIに送信（セッション情報を含める）
              // @requirements 1.3, 2.1, 2.4 - シーケンス番号とセッションIDを転送
              const callbackUrl = `${request.nextUrl.origin}/api/generate-video-callback`;
              const callbackBody: {
                videoPath: string;
                sessionId?: string;
                sequence?: number;
                totalCount?: number;
              } = {
                videoPath: result.outputPath,
              };

              // セッション情報がある場合は含める
              if (sessionId !== undefined && sequence !== undefined && totalCount !== undefined) {
                callbackBody.sessionId = sessionId;
                callbackBody.sequence = sequence;
                callbackBody.totalCount = totalCount;
              }

              fetch(callbackUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(callbackBody),
              }).catch((error) => {
                console.error('Error calling callback API:', error);
              });

              results.push({
                action: result.action,
                outputPath: result.outputPath,
                videoUrl,
              });
            }
          }
        } catch (error) {
          console.error('Error parsing NDJSON line:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error in generate-video API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}
