/**
 * SSEエンドポイント - リアルタイム状態プッシュ
 * @see .kiro/specs/remote-control-panel/design.md - /api/remote/events (SSE)
 */

import { getAppState, subscribe, subscribeCommand } from '@/lib/remoteState';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 初期状態を送信
      const initialState = getAppState();
      const initialEvent = formatSSEMessage('state-update', initialState);
      controller.enqueue(encoder.encode(initialEvent));

      // 状態変更を購読
      const unsubscribeState = subscribe((state) => {
        const event = formatSSEMessage('state-update', state);
        try {
          controller.enqueue(encoder.encode(event));
        } catch {
          // ストリームがクローズ済みの場合
          unsubscribeState();
        }
      });

      // コマンド配信を購読
      const unsubscribeCommand = subscribeCommand((command) => {
        const event = formatSSEMessage('command-received', command);
        try {
          controller.enqueue(encoder.encode(event));
        } catch {
          // ストリームがクローズ済みの場合
          unsubscribeCommand();
        }
      });

      // キャンセル時のクリーンアップ
      return () => {
        unsubscribeState();
        unsubscribeCommand();
      };
    },
    cancel() {
      // ReadableStreamがキャンセルされた時
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function formatSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
