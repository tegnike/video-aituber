/**
 * 動画順序保証の統合テスト
 * @see .kiro/specs/video-order-fix/tasks.md - Task 4.1, 4.2
 *
 * Requirements:
 * - 1.1: 開始ボタンで設定順序通りに動画再生
 * - 1.2: 終了ボタンで設定順序通りに動画再生
 * - 1.4: afterActionsがactionsの後に再生
 * - 2.1: sessionIdなしのリクエストが従来通り動作
 * - 3.1: sessionIdなしのリクエストが従来通り動作
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/generate-video-callback/route';
import { NextRequest } from 'next/server';
import { resetSessionQueues } from '@/lib/sessionVideoQueue';
import { resetLegacyQueue } from '@/lib/legacyVideoQueue';

// モックリクエストを作成するヘルパー
function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/generate-video-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/generate-video-callback');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('動画順序保証 統合テスト', () => {
  beforeEach(() => {
    resetSessionQueues();
    resetLegacyQueue();
  });

  describe('Task 4.1: 開始・終了ボタンの順序保証テスト', () => {
    describe('Requirement 1.1: 開始ボタンで順序通りに再生', () => {
      it('actionsが設定順序通りに取得できる（3つのアクション）', async () => {
        const sessionId = 'start-session-1';
        const actions = ['greeting', 'introduction', 'main'];

        // 順序バラバラでコールバックを受信（実際の動画生成完了順序をシミュレート）
        await POST(createPostRequest({
          videoPath: '/tmp/introduction.mp4',
          sessionId,
          sequence: 1,
          totalCount: 3,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/main.mp4',
          sessionId,
          sequence: 2,
          totalCount: 3,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/greeting.mp4',
          sessionId,
          sequence: 0,
          totalCount: 3,
        }));

        // 順序通りに取得されることを確認
        let res = await GET(createGetRequest({ sessionId }));
        let data = await res.json();
        expect(data.videoPath).toContain('greeting.mp4');
        expect(data.sequence).toBe(0);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('introduction.mp4');
        expect(data.sequence).toBe(1);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('main.mp4');
        expect(data.sequence).toBe(2);
        expect(data.isComplete).toBe(true);
      });

      it('actionsが1つだけの場合も正しく動作する', async () => {
        const sessionId = 'single-action-session';

        await POST(createPostRequest({
          videoPath: '/tmp/single.mp4',
          sessionId,
          sequence: 0,
          totalCount: 1,
        }));

        const res = await GET(createGetRequest({ sessionId }));
        const data = await res.json();
        expect(data.videoPath).toContain('single.mp4');
        expect(data.sequence).toBe(0);
        expect(data.isComplete).toBe(true);
      });
    });

    describe('Requirement 1.2: 終了ボタンで順序通りに再生', () => {
      it('終了ボタンのactionsが設定順序通りに取得できる', async () => {
        const sessionId = 'end-session-1';

        // 終了ボタン用のアクションをシミュレート
        await POST(createPostRequest({
          videoPath: '/tmp/goodbye.mp4',
          sessionId,
          sequence: 0,
          totalCount: 2,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/thanks.mp4',
          sessionId,
          sequence: 1,
          totalCount: 2,
        }));

        // 順序通りに取得
        let res = await GET(createGetRequest({ sessionId }));
        let data = await res.json();
        expect(data.videoPath).toContain('goodbye.mp4');
        expect(data.sequence).toBe(0);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('thanks.mp4');
        expect(data.sequence).toBe(1);
        expect(data.isComplete).toBe(true);
      });
    });

    describe('Requirement 1.4: afterActionsはactionsの後に再生', () => {
      it('actionsの後にafterActionsが取得される', async () => {
        const sessionId = 'with-after-actions';

        // actions: 0, 1, afterActions: 2, 3
        // 順序バラバラで受信
        await POST(createPostRequest({
          videoPath: '/tmp/after2.mp4',
          sessionId,
          sequence: 3,
          totalCount: 4,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/action1.mp4',
          sessionId,
          sequence: 0,
          totalCount: 4,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/after1.mp4',
          sessionId,
          sequence: 2,
          totalCount: 4,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/action2.mp4',
          sessionId,
          sequence: 1,
          totalCount: 4,
        }));

        // actionsが先に取得される
        let res = await GET(createGetRequest({ sessionId }));
        let data = await res.json();
        expect(data.videoPath).toContain('action1.mp4');
        expect(data.sequence).toBe(0);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('action2.mp4');
        expect(data.sequence).toBe(1);

        // afterActionsが後に取得される
        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('after1.mp4');
        expect(data.sequence).toBe(2);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('after2.mp4');
        expect(data.sequence).toBe(3);
        expect(data.isComplete).toBe(true);
      });

      it('afterActionsが1つの場合も正しく動作する', async () => {
        const sessionId = 'single-after-action';

        // actions: 0, afterActions: 1
        await POST(createPostRequest({
          videoPath: '/tmp/main.mp4',
          sessionId,
          sequence: 0,
          totalCount: 2,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/loop.mp4',
          sessionId,
          sequence: 1,
          totalCount: 2,
        }));

        let res = await GET(createGetRequest({ sessionId }));
        let data = await res.json();
        expect(data.videoPath).toContain('main.mp4');
        expect(data.sequence).toBe(0);

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('loop.mp4');
        expect(data.sequence).toBe(1);
        expect(data.isComplete).toBe(true);
      });
    });

    describe('複数動画の順序保証シナリオ', () => {
      it('5つの動画が完全にバラバラの順序で到着しても正しく並ぶ', async () => {
        const sessionId = 'complex-order-test';
        const expectedOrder = [
          '/tmp/video0.mp4',
          '/tmp/video1.mp4',
          '/tmp/video2.mp4',
          '/tmp/video3.mp4',
          '/tmp/video4.mp4',
        ];

        // 完全にランダムな順序で登録
        await POST(createPostRequest({
          videoPath: expectedOrder[3],
          sessionId,
          sequence: 3,
          totalCount: 5,
        }));
        await POST(createPostRequest({
          videoPath: expectedOrder[0],
          sessionId,
          sequence: 0,
          totalCount: 5,
        }));
        await POST(createPostRequest({
          videoPath: expectedOrder[4],
          sessionId,
          sequence: 4,
          totalCount: 5,
        }));
        await POST(createPostRequest({
          videoPath: expectedOrder[1],
          sessionId,
          sequence: 1,
          totalCount: 5,
        }));
        await POST(createPostRequest({
          videoPath: expectedOrder[2],
          sessionId,
          sequence: 2,
          totalCount: 5,
        }));

        // 順序通りに取得されることを確認
        for (let i = 0; i < 5; i++) {
          const res = await GET(createGetRequest({ sessionId }));
          const data = await res.json();
          expect(data.videoPath).toContain(`video${i}.mp4`);
          expect(data.sequence).toBe(i);
          if (i === 4) {
            expect(data.isComplete).toBe(true);
          } else {
            expect(data.isComplete).toBe(false);
          }
        }
      });

      it('次のシーケンスが未到着の場合は待機する', async () => {
        const sessionId = 'waiting-test';

        // sequence 1, 2のみ登録（0をスキップ）
        await POST(createPostRequest({
          videoPath: '/tmp/video1.mp4',
          sessionId,
          sequence: 1,
          totalCount: 3,
        }));
        await POST(createPostRequest({
          videoPath: '/tmp/video2.mp4',
          sessionId,
          sequence: 2,
          totalCount: 3,
        }));

        // sequence 0が未到着のためnullが返る
        let res = await GET(createGetRequest({ sessionId }));
        let data = await res.json();
        expect(data.videoPath).toBeNull();

        // sequence 0を登録
        await POST(createPostRequest({
          videoPath: '/tmp/video0.mp4',
          sessionId,
          sequence: 0,
          totalCount: 3,
        }));

        // 全て順序通りに取得できる
        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('video0.mp4');

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('video1.mp4');

        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('video2.mp4');
        expect(data.isComplete).toBe(true);
      });
    });
  });

  describe('Task 4.2: 後方互換性テスト', () => {
    describe('Requirement 2.1, 3.1: sessionIdなしのリクエストが従来通り動作', () => {
      it('sessionIdなしでPOSTした動画が取得できる', async () => {
        // sessionIdなしで登録
        await POST(createPostRequest({
          videoPath: '/tmp/legacy-video.mp4',
        }));

        // sessionIdなしで取得
        const res = await GET(createGetRequest());
        const data = await res.json();
        expect(data.videoPath).toContain('legacy-video.mp4');
      });

      it('sessionIdなしの複数動画が取得できる（同一ミリ秒でIDが重複しなければ挿入順）', async () => {
        // 従来方式では同一ミリ秒でPOSTするとIDが重複して上書きされる可能性がある
        // ここでは少し間隔を空けて登録
        await POST(createPostRequest({
          videoPath: '/tmp/first.mp4',
        }));
        // 1ms待機してID重複を回避
        await new Promise(resolve => setTimeout(resolve, 2));
        await POST(createPostRequest({
          videoPath: '/tmp/second.mp4',
        }));
        await new Promise(resolve => setTimeout(resolve, 2));
        await POST(createPostRequest({
          videoPath: '/tmp/third.mp4',
        }));

        // 挿入順で取得（Mapは挿入順序を保持）
        let res = await GET(createGetRequest());
        let data = await res.json();
        expect(data.videoPath).toContain('first.mp4');

        res = await GET(createGetRequest());
        data = await res.json();
        expect(data.videoPath).toContain('second.mp4');

        res = await GET(createGetRequest());
        data = await res.json();
        expect(data.videoPath).toContain('third.mp4');
      });

      it('sessionIdなしのキューが空の場合はnullを返す', async () => {
        const res = await GET(createGetRequest());
        const data = await res.json();
        expect(data.videoPath).toBeNull();
      });
    });

    describe('セッション付きと従来方式の共存', () => {
      it('セッション付きと従来方式が独立して動作する', async () => {
        const sessionId = 'coexist-session';

        // セッション付きで登録
        await POST(createPostRequest({
          videoPath: '/tmp/session-video.mp4',
          sessionId,
          sequence: 0,
          totalCount: 1,
        }));

        // 従来方式で登録
        await POST(createPostRequest({
          videoPath: '/tmp/legacy-video.mp4',
        }));

        // 従来方式で取得（セッションには影響しない）
        let res = await GET(createGetRequest());
        let data = await res.json();
        expect(data.videoPath).toContain('legacy-video.mp4');

        // セッション付きで取得（従来方式には影響しない）
        res = await GET(createGetRequest({ sessionId }));
        data = await res.json();
        expect(data.videoPath).toContain('session-video.mp4');
      });

      it('異なるセッションが独立して動作する', async () => {
        const session1 = 'session-1';
        const session2 = 'session-2';

        // セッション1に登録
        await POST(createPostRequest({
          videoPath: '/tmp/s1-video.mp4',
          sessionId: session1,
          sequence: 0,
          totalCount: 1,
        }));

        // セッション2に登録
        await POST(createPostRequest({
          videoPath: '/tmp/s2-video.mp4',
          sessionId: session2,
          sequence: 0,
          totalCount: 1,
        }));

        // 各セッションから独立して取得
        let res = await GET(createGetRequest({ sessionId: session1 }));
        let data = await res.json();
        expect(data.videoPath).toContain('s1-video.mp4');

        res = await GET(createGetRequest({ sessionId: session2 }));
        data = await res.json();
        expect(data.videoPath).toContain('s2-video.mp4');
      });
    });

    describe('チャット応答動画への影響確認', () => {
      it('チャット応答動画（sessionIdなし）が正常に動作する', async () => {
        // チャット応答動画は従来通りsessionIdなしで登録される
        // ID重複を避けるため間隔を空ける
        await POST(createPostRequest({
          videoPath: '/tmp/chat-response-1.mp4',
        }));
        await new Promise(resolve => setTimeout(resolve, 2));
        await POST(createPostRequest({
          videoPath: '/tmp/chat-response-2.mp4',
        }));

        // 挿入順で取得できる
        let res = await GET(createGetRequest());
        let data = await res.json();
        expect(data.videoPath).toContain('chat-response-1.mp4');

        res = await GET(createGetRequest());
        data = await res.json();
        expect(data.videoPath).toContain('chat-response-2.mp4');
      });

      it('コントロール動画とチャット応答動画が混在しても正しく動作する', async () => {
        const controlSessionId = 'control-session';

        // コントロール動画（セッション付き）
        await POST(createPostRequest({
          videoPath: '/tmp/control.mp4',
          sessionId: controlSessionId,
          sequence: 0,
          totalCount: 1,
        }));

        // チャット応答動画（セッションなし）
        await POST(createPostRequest({
          videoPath: '/tmp/chat.mp4',
        }));

        // それぞれ独立して取得可能
        const controlRes = await GET(createGetRequest({ sessionId: controlSessionId }));
        const controlData = await controlRes.json();
        expect(controlData.videoPath).toContain('control.mp4');

        const chatRes = await GET(createGetRequest());
        const chatData = await chatRes.json();
        expect(chatData.videoPath).toContain('chat.mp4');
      });
    });
  });
});
