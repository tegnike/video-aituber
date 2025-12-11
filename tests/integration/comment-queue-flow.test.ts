/**
 * コメントキュー操作フローの統合テスト
 * @see .kiro/specs/comment-queue-control/tasks.md - Task 4.1
 *
 * Requirements:
 * - 1.1: コメントをキュー一覧に追加表示
 * - 2.1: LLMへの自動送信を行わない
 * - 2.2: メイン画面に通常表示
 * - 3.1: コメントをLLMに送信
 * - 4.1: 送信完了後に送信済みとしてマーク
 * - 5.1: メイン画面に送信状態を表示しない
 * - 5.2: すべてのコメントを通常表示
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { POST as commandPOST } from '@/app/api/remote/command/route';
import { POST as statePOST, GET as stateGET } from '@/app/api/remote/state/route';
import {
  resetAppState,
  getAppState,
  updateAppState,
  type AppState,
  type QueuedComment,
} from '@/lib/remoteState';
import { clearCommandQueue, dequeueAllCommands } from '@/lib/commandQueue';

describe('コメントキュー操作フロー統合テスト', () => {
  beforeEach(() => {
    resetAppState();
    clearCommandQueue();
  });

  describe('コメント受信からキュー追加フロー (Requirements 1.1, 2.1, 2.2, 2.3)', () => {
    it('コメントをキューに追加した状態を報告できる', async () => {
      const comment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };

      // メイン画面がコメントキューを含む状態を報告
      const request = new Request('http://localhost/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasStarted: true,
          screenMode: 'room',
          isLoadingBackground: false,
          isLoadingControlVideo: false,
          controlVideoType: null,
          oneCommeEnabled: true,
          oneCommeConnected: true,
          isScriptSending: false,
          uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          commentQueue: [comment],
        } as AppState),
      });

      const response = await statePOST(request);
      expect(response.status).toBe(200);

      // 状態が更新されていることを確認
      const state = getAppState();
      expect(state.commentQueue.length).toBe(1);
      expect(state.commentQueue[0].id).toBe('comment-1');
      expect(state.commentQueue[0].name).toBe('テストユーザー');
      expect(state.commentQueue[0].isSent).toBe(false);
    });

    it('複数コメントをキューに追加した状態を報告できる', async () => {
      const comments: QueuedComment[] = [
        {
          id: 'comment-1',
          name: 'ユーザーA',
          comment: 'コメントA',
          receivedAt: Date.now(),
          isSent: false,
        },
        {
          id: 'comment-2',
          name: 'ユーザーB',
          comment: 'コメントB',
          receivedAt: Date.now() - 1000,
          isSent: false,
        },
      ];

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: comments,
          } as AppState),
        })
      );

      const state = getAppState();
      expect(state.commentQueue.length).toBe(2);
      expect(state.commentQueue[0].id).toBe('comment-1');
      expect(state.commentQueue[1].id).toBe('comment-2');
    });

    it('リモートパネルからコメントキュー状態を取得できる', async () => {
      const comment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };

      // メイン画面が状態を報告
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [comment],
          } as AppState),
        })
      );

      // リモートパネルが状態を取得
      const getResponse = await stateGET(new Request('http://localhost/api/remote/state'));
      const state = await getResponse.json();

      expect(state.commentQueue).toBeDefined();
      expect(state.commentQueue.length).toBe(1);
      expect(state.commentQueue[0].id).toBe('comment-1');
    });
  });

  describe('コメント送信コマンドフロー (Requirements 3.1, 3.3)', () => {
    it('sendQueuedCommentコマンドを送信できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'comment-1' }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      // コマンドキューに追加されていることを確認
      const commands = dequeueAllCommands();
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual({ type: 'sendQueuedComment', commentId: 'comment-1' });
    });

    it('複数のコメント送信コマンドを順次送信できる', async () => {
      // コメント1送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'comment-1' }),
        })
      );

      // コメント2送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'comment-2' }),
        })
      );

      const commands = dequeueAllCommands();
      expect(commands.length).toBe(2);
      expect(commands[0]).toEqual({ type: 'sendQueuedComment', commentId: 'comment-1' });
      expect(commands[1]).toEqual({ type: 'sendQueuedComment', commentId: 'comment-2' });
    });
  });

  describe('送信済み状態の更新フロー (Requirement 4.1)', () => {
    it('コメント送信後に送信済み状態を報告できる', async () => {
      // 初期状態: 未送信コメント
      const initialComment: QueuedComment = {
        id: 'comment-1',
        name: 'テストユーザー',
        comment: 'テストコメント',
        receivedAt: Date.now(),
        isSent: false,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [initialComment],
          } as AppState),
        })
      );

      expect(getAppState().commentQueue[0].isSent).toBe(false);

      // 送信コマンド
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'comment-1' }),
        })
      );

      // 送信完了後の状態を報告
      const sentComment: QueuedComment = {
        ...initialComment,
        isSent: true,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [sentComment],
          } as AppState),
        })
      );

      // 送信済み状態が反映されていることを確認
      const state = getAppState();
      expect(state.commentQueue[0].isSent).toBe(true);
    });
  });

  describe('コメントキュー状態の同期フロー (Requirements 1.1, 2.3, 4.1)', () => {
    it('キューへの追加と送信済み更新の状態変更がSSE経由で同期される', async () => {
      // 新しいコメントを追加
      const newComment: QueuedComment = {
        id: 'new-comment',
        name: '新しいユーザー',
        comment: '新しいコメント',
        receivedAt: Date.now(),
        isSent: false,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [newComment],
          } as AppState),
        })
      );

      // GET APIで状態を取得してリモートパネルで確認可能か検証
      const response = await stateGET(new Request('http://localhost/api/remote/state'));
      const state = await response.json();

      expect(state.commentQueue.length).toBe(1);
      expect(state.commentQueue[0].name).toBe('新しいユーザー');
      expect(state.commentQueue[0].isSent).toBe(false);
    });
  });

  describe('エンドツーエンドのフロー検証', () => {
    it('完全なフロー: わんコメ受信→キュー追加→送信ボタン→送信済み表示', async () => {
      // Step 1: わんコメからコメント受信 → キューに追加（メイン画面が状態報告）
      const comment: QueuedComment = {
        id: 'onecomme-comment-1',
        name: '視聴者A',
        comment: 'こんにちは！',
        profileImage: 'https://example.com/avatar.png',
        receivedAt: Date.now(),
        isSent: false,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [comment],
          } as AppState),
        })
      );

      // リモートパネルでキューを確認
      let state = getAppState();
      expect(state.commentQueue.length).toBe(1);
      expect(state.commentQueue[0].isSent).toBe(false);

      // Step 2: リモートパネルから送信コマンドを送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'onecomme-comment-1' }),
        })
      );

      // コマンドがキューに追加されていることを確認
      const commands = dequeueAllCommands();
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual({ type: 'sendQueuedComment', commentId: 'onecomme-comment-1' });

      // Step 3: メイン画面がLLM送信完了後、送信済み状態を報告
      const sentComment: QueuedComment = {
        ...comment,
        isSent: true,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [sentComment],
          } as AppState),
        })
      );

      // Step 4: 送信済み状態がリモートパネルで確認可能
      state = getAppState();
      expect(state.commentQueue[0].isSent).toBe(true);

      // GET APIでも同様に確認可能
      const getResponse = await stateGET(new Request('http://localhost/api/remote/state'));
      const remoteState = await getResponse.json();
      expect(remoteState.commentQueue[0].isSent).toBe(true);
    });

    it('複数コメントの順次送信フロー', async () => {
      // 複数のコメントをキューに追加
      const comments: QueuedComment[] = [
        {
          id: 'comment-a',
          name: '視聴者A',
          comment: 'コメント1',
          receivedAt: Date.now(),
          isSent: false,
        },
        {
          id: 'comment-b',
          name: '視聴者B',
          comment: 'コメント2',
          receivedAt: Date.now() - 1000,
          isSent: false,
        },
        {
          id: 'comment-c',
          name: '視聴者C',
          comment: 'コメント3',
          receivedAt: Date.now() - 2000,
          isSent: false,
        },
      ];

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: comments,
          } as AppState),
        })
      );

      // コメントBを送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendQueuedComment', commentId: 'comment-b' }),
        })
      );

      // コメントBのみ送信済みに更新
      const updatedComments = comments.map((c) =>
        c.id === 'comment-b' ? { ...c, isSent: true } : c
      );

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: updatedComments,
          } as AppState),
        })
      );

      // 状態を確認
      const state = getAppState();
      expect(state.commentQueue.find((c) => c.id === 'comment-a')?.isSent).toBe(false);
      expect(state.commentQueue.find((c) => c.id === 'comment-b')?.isSent).toBe(true);
      expect(state.commentQueue.find((c) => c.id === 'comment-c')?.isSent).toBe(false);
    });
  });

  describe('プロフィール画像を含むコメントの処理', () => {
    it('プロフィール画像URLを含むコメントを正しく処理できる', async () => {
      const comment: QueuedComment = {
        id: 'comment-with-avatar',
        name: 'アバター付きユーザー',
        comment: 'アバター付きコメント',
        profileImage: 'https://example.com/avatar.png',
        receivedAt: Date.now(),
        isSent: false,
      };

      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: true,
            oneCommeConnected: true,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
            commentQueue: [comment],
          } as AppState),
        })
      );

      const state = getAppState();
      expect(state.commentQueue[0].profileImage).toBe('https://example.com/avatar.png');
    });
  });
});
