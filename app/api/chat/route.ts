import { openai } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

type VideoRequest =
  | { action: 'speak'; params: { text: string; emotion: string } }
  | { action: 'idle'; params: { durationMs: number } };

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // OpenAI APIでチャット完了とアクション列生成を同時に行う
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは親しみやすく明るいAIアシスタントです。
ユーザーと自然で楽しい会話をしながら、質問に答えたり、話を聞いたりします。

回答はJSON形式で以下のように返してください：
{
  "message": "ユーザーへの返答メッセージ",
  "requests": [
    { "action": "speak", "params": { "text": "発話内容1", "emotion": "neutral" } },
    { "action": "idle", "params": { "durationMs": 1000 } },
    { "action": "speak", "params": { "text": "発話内容2", "emotion": "thinking" } }
  ]
}

## ルール
- messageは簡潔でわかりやすい返答にしてください
- requestsは発話と間を表現するアクション列です
- 発話を分割して、間にidleを入れることで自然な演出ができます
- emotionは"neutral"（通常）または"thinking"（考え中）から選択
- idleのdurationMsは2000-3000の範囲で設定
- 短い返答なら1つのspeakだけでもOKです`,
        },
        ...(history || []),
        {
          role: 'user',
          content: message,
        },
      ],
      response_format: { type: 'json_object' },
    });

    let assistantMessage = '';
    let requests: VideoRequest[] = [];

    try {
      const responseData = JSON.parse(
        completion.choices[0]?.message?.content || '{}'
      );
      assistantMessage = responseData.message || '';
      requests = responseData.requests || [];

      // requestsが空の場合はフォールバック
      if (requests.length === 0 && assistantMessage) {
        requests = [
          { action: 'speak', params: { text: assistantMessage, emotion: 'neutral' } },
        ];
      }

      // requests配列からすべてのspeakアクションのテキストを結合してメッセージに含める
      const speakTexts = requests
        .filter((req): req is { action: 'speak'; params: { text: string; emotion: string } } => 
          req.action === 'speak' && 'text' in req.params
        )
        .map((req) => req.params.text);
      
      if (speakTexts.length > 0) {
        // speakアクションのテキストを結合してメッセージとして使用
        // これにより、すべての発話内容（「うーん、」など）がチャット履歴に表示される
        assistantMessage = speakTexts.join('');
      }
    } catch (error) {
      console.error('Error parsing completion response:', error);
      assistantMessage = completion.choices[0]?.message?.content || '';
      requests = [
        { action: 'speak', params: { text: assistantMessage, emotion: 'neutral' } },
      ];
    }

    // 動画生成APIへのリクエスト（非同期で開始）
    const videoGenerationUrl =
      process.env.VIDEO_GENERATION_API_URL ||
      'http://localhost:4000/api/generate';
    const presetId = process.env.VIDEO_GENERATION_PRESET_ID || 'character';

    const requestBody = {
      presetId,
      stream: true,
      requests,
    };

    console.log('Sending request to video generation API:');
    console.log('URL:', videoGenerationUrl);
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    // 動画生成を非同期で開始し、NDJSONレスポンスを処理
    fetch(videoGenerationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

              // doneタイプの場合、ストリーム完了
              if (data.type === 'done') {
                console.log(`Video generation completed: ${data.count} videos generated`);
                break;
              }

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
