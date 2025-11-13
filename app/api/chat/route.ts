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
      'http://localhost:4000/api/generate';

    // メッセージを speak アクションに変換
    const requests = [
      { action: 'speak', params: { text: assistantMessage } },
    ];

    // 動画生成を非同期で開始し、NDJSONレスポンスを処理
    fetch(videoGenerationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        requests,
      }),
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error('Failed to fetch video generation API');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // NDJSONを1行ずつ読み取る
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
              // resultタイプの場合、コールバックAPIに送信
              if (data.type === 'result' && data.result?.outputPath) {
                const callbackUrl = `${request.nextUrl.origin}/api/generate-video-callback`;
                fetch(callbackUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    videoPath: data.result.outputPath,
                  }),
                }).catch((error) => {
                  console.error('Error calling callback API:', error);
                });
              }
            } catch (error) {
              console.error('Error parsing NDJSON line:', error);
            }
          }
        }
      })
      .catch((error) => {
        // エラーが発生した場合でも、チャットAPIのレスポンスは返す
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

