import { openai } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';
import {
  getEmotions,
  getIdleDurationRange,
  getAvailableActions,
} from '@/lib/videoGenerationConfig';

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

    // 設定ファイルから動的に値を取得
    const emotions = getEmotions();
    const idleRange = getIdleDurationRange();
    const availableActions = getAvailableActions();

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
    { "action": "speak", "params": { "text": "発話内容1", "emotion": "${emotions[0] || 'neutral'}" } },
    { "action": "speak", "params": { "text": "発話内容2", "emotion": "${emotions[1] || 'thinking'}" } },
     ...（必要に応じて）
  ]
}

## ルール
- messageは簡潔でわかりやすい返答にしてください
- requestsは発話と間を表現するアクション列です
- emotionは${emotions.map(e => `"${e}"`).join('または')}から選択
- 利用可能なアクション: ${availableActions.filter(a => a !== 'loop').join(', ')}
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
    const generateVideoUrl = `${request.nextUrl.origin}/api/generate-video`;
    fetch(generateVideoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }).catch((error) => {
      console.error('Error calling generate-video API:', error);
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
