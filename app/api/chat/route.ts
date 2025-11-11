import { openai } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // OpenAI APIでチャット完了を待つ
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...(history || []),
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const assistantMessage = completion.choices[0]?.message?.content || '';

    // 動画生成APIへのリクエスト（非同期で開始）
    const videoGenerationUrl =
      process.env.VIDEO_GENERATION_API_URL ||
      'http://localhost:3001/api/generate-video';
    const voicevoxEndpoint =
      process.env.VOICEVOX_ENDPOINT || 'http://localhost:10101';
    const voiceId = process.env.VOICE_ID || '633572448';

    // 動画生成を非同期で開始し、レスポンスを処理
    // タイムアウトを5分に設定（動画生成には時間がかかる可能性があるため）
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5 * 60 * 1000)
    );

    Promise.race([
      fetch(videoGenerationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: assistantMessage,
          voicevoxEndpoint,
          voiceId,
        }),
      }),
      timeoutPromise,
    ] as [Promise<Response>, Promise<never>])
      .then((response) => {
        if (response instanceof Response) {
          return response.json();
        }
        throw new Error('Invalid response');
      })
      .then((data) => {
        // 動画パスが返ってきたら、コールバックAPIに送信
        if (data.path) {
          const callbackUrl = `${request.nextUrl.origin}/api/generate-video-callback`;
          fetch(callbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoPath: data.path,
            }),
          }).catch((error) => {
            console.error('Error calling callback API:', error);
          });
        }
      })
      .catch((error) => {
        // タイムアウトやエラーが発生した場合でも、チャットAPIのレスポンスは返す
        console.error('Error calling video generation API:', error);
      });

    return NextResponse.json({
      message: assistantMessage,
      role: 'assistant',
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

