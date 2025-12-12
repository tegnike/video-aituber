import { NextRequest, NextResponse } from 'next/server';

type VideoRequest = {
  action: 'speak';
  params: { text: string; emotion: string };
};

// セグメント型
interface Segment {
  text: string;
  emotion: string;
}

// ワークフローAPIレスポンスの型
interface WorkflowResponse {
  // 新形式
  segments?: Segment[];
  // 後方互換用
  response?: string;
  emotion?: string;
  // 共通
  usernameReading: string;
  isFirstTime: boolean;
  shouldRespond: boolean;
}

const WORKFLOW_URL = process.env.AITUBER_WORKFLOW_URL || 'http://localhost:4111';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, username, comment, history } = await request.json();

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    // Mastraワークフローを呼び出し
    const workflowRes = await fetch(
      `${WORKFLOW_URL}/api/workflows/aituberWorkflow/start-async`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputData: {
            sessionId: sessionId || 'default-session',
            username: username || 'ゲスト',
            comment,
          },
        }),
      }
    );

    if (!workflowRes.ok) {
      const errorText = await workflowRes.text();
      console.error('Workflow API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to call workflow API' },
        { status: 500 }
      );
    }

    const rawData = await workflowRes.json();
    // Mastraワークフローのレスポンスは { result: {...} } 形式
    const workflowData = (rawData.result || rawData) as WorkflowResponse;

    // 応答しない場合
    if (!workflowData.shouldRespond) {
      return NextResponse.json({
        message: '',
        segments: [],
        role: 'assistant',
        shouldRespond: false,
      });
    }

    // segments を VideoRequest[] に変換
    let requests: VideoRequest[];
    let displayMessage: string;

    if (workflowData.segments && workflowData.segments.length > 0) {
      // 新形式: segments配列を使用
      requests = workflowData.segments.map((segment) => ({
        action: 'speak' as const,
        params: { text: segment.text, emotion: segment.emotion },
      }));
      displayMessage = workflowData.segments.map(s => s.text).join(' ');
    } else if (workflowData.response) {
      // 旧形式: 単一response/emotionを使用（後方互換性）
      requests = [{
        action: 'speak',
        params: {
          text: workflowData.response,
          emotion: workflowData.emotion || 'neutral',
        },
      }];
      displayMessage = workflowData.response;
    } else {
      // どちらも無い場合はエラー
      return NextResponse.json(
        { error: 'Invalid workflow response' },
        { status: 500 }
      );
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
      message: displayMessage,
      segments: workflowData.segments || [{ text: displayMessage, emotion: workflowData.emotion || 'neutral' }],
      role: 'assistant',
      shouldRespond: true,
      usernameReading: workflowData.usernameReading,
      isFirstTime: workflowData.isFirstTime,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
