import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Script, validateScript, DEFAULT_EMOTION, parseScriptsConfig } from '@/lib/scriptTypes';
import { VideoRequest, GenerateVideoResponse } from '@/app/api/generate-video/route';

/**
 * 台本送信リクエスト
 * script または scriptId のいずれかを指定
 */
interface ScriptSendRequest {
  script?: Script;
  scriptId?: string;
}

/**
 * scriptIdから台本を検索する
 */
function findScriptById(scriptId: string): Script | null {
  const configPath = path.join(process.cwd(), 'config', 'scripts.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const { scripts } = parseScriptsConfig(data);
    return scripts.find(s => s.id === scriptId) || null;
  } catch {
    return null;
  }
}

/**
 * 台本送信レスポンス
 */
interface ScriptSendResponse {
  success: boolean;
  error?: string;
}

/**
 * 台本を動画生成サーバーに直接送信するAPI
 * POST /api/script-send
 *
 * LLMワークフローをバイパスして動画生成APIに直接リクエストを送信する
 *
 * @requirements 1.3, 2.1, 2.2
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ScriptSendResponse>> {
  try {
    const body = (await request.json()) as ScriptSendRequest;
    let { script } = body;
    const { scriptId } = body;

    // scriptId が指定された場合は台本を検索
    if (!script && scriptId) {
      script = findScriptById(scriptId) ?? undefined;
      if (!script) {
        return NextResponse.json(
          { success: false, error: `台本が見つかりません: ${scriptId}` },
          { status: 404 }
        );
      }
    }

    // バリデーション
    const errors = validateScript(script);
    if (errors.length > 0) {
      console.warn('[/api/script-send] バリデーションエラー:', errors);
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Script → VideoRequest 形式に変換
    const videoRequest: VideoRequest = {
      action: 'speak',
      params: {
        text: script.text,
        emotion: script.emotion ?? DEFAULT_EMOTION,
        ...script.params,
      },
    };

    // 動画生成APIを呼び出し
    const generateVideoUrl = `${request.nextUrl.origin}/api/generate-video`;
    console.log('[/api/script-send] 動画生成APIを呼び出します:', {
      script: script.id,
      text: script.text,
    });

    const response = await fetch(generateVideoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [videoRequest],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[/api/script-send] 動画生成APIエラー:', errorData);
      return NextResponse.json(
        {
          success: false,
          error:
            (errorData as GenerateVideoResponse)?.error ||
            '動画生成に失敗しました',
        },
        { status: 500 }
      );
    }

    const result = (await response.json()) as GenerateVideoResponse;

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '動画生成に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[/api/script-send] 動画生成成功:', result.results);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/script-send] 予期しないエラー:', error);
    return NextResponse.json(
      { success: false, error: '台本の送信に失敗しました' },
      { status: 500 }
    );
  }
}
