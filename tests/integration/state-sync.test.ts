/**
 * 状態同期の検証テスト
 * @see .kiro/specs/remote-control-panel/tasks.md - Task 5.2
 *
 * Requirements:
 * - 3.3: 現在モード表示（状態同期）
 * - 4.1: 接続状態表示
 * - 4.4: SSE接続断→自動再接続
 * - 5.1, 5.2, 5.3: UI表示切替がメイン画面に反映
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as statePOST, GET as stateGET } from '@/app/api/remote/state/route';
import { POST as commandPOST } from '@/app/api/remote/command/route';
import {
  resetAppState,
  getAppState,
  updateAppState,
  subscribe,
  subscribeCommand,
  type AppState,
  type RemoteCommand,
} from '@/lib/remoteState';

describe('状態同期検証テスト', () => {
  beforeEach(() => {
    resetAppState();
  });

  describe('状態購読と通知 (Requirement 3.3, 4.1)', () => {
    it('状態変更時に全ての購読者に通知される', () => {
      const receivedStates1: AppState[] = [];
      const receivedStates2: AppState[] = [];

      const unsub1 = subscribe((state) => {
        receivedStates1.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });
      const unsub2 = subscribe((state) => {
        receivedStates2.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });

      // 状態更新
      updateAppState({ hasStarted: true, screenMode: 'room' });

      unsub1();
      unsub2();

      // 両方の購読者に通知されたことを確認
      expect(receivedStates1.length).toBe(1);
      expect(receivedStates2.length).toBe(1);
      expect(receivedStates1[0].screenMode).toBe('room');
      expect(receivedStates2[0].screenMode).toBe('room');
    });

    it('API経由の状態更新が購読者に通知される', async () => {
      const receivedStates: AppState[] = [];
      const unsub = subscribe((state) => {
        receivedStates.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });

      // POST /api/remote/state で状態更新
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'standby',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      unsub();

      // 購読者に通知されたことを確認
      expect(receivedStates.length).toBe(1);
      expect(receivedStates[0].screenMode).toBe('standby');
    });

    it('コマンド経由の状態変更も購読者に通知される', async () => {
      const receivedStates: AppState[] = [];
      const unsub = subscribe((state) => {
        receivedStates.push({ ...state, uiVisibility: { ...state.uiVisibility } });
      });

      // コマンドで状態変更
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'selectMode', mode: 'room' }),
        })
      );

      unsub();

      // 購読者に通知されたことを確認
      expect(receivedStates.length).toBe(1);
      expect(receivedStates[0].screenMode).toBe('room');
      expect(receivedStates[0].hasStarted).toBe(true);
    });
  });

  describe('メイン画面の状態変更がリモートパネルに反映 (Requirement 3.3)', () => {
    it('メイン画面の画面モード変更がGET APIで取得可能', async () => {
      // メイン画面が状態を報告
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'standby',
            isLoadingBackground: true,
            isLoadingControlVideo: false,
            controlVideoType: null,
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      // リモートパネルが状態を取得
      const response = await stateGET(new Request('http://localhost/api/remote/state'));
      const state = await response.json();

      expect(state.screenMode).toBe('standby');
      expect(state.isLoadingBackground).toBe(true);
    });

    it('メイン画面のローディング状態変更が反映される', async () => {
      // ローディング開始
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: true,
            controlVideoType: 'start',
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      let state = getAppState();
      expect(state.isLoadingControlVideo).toBe(true);
      expect(state.controlVideoType).toBe('start');

      // ローディング完了
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
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      state = getAppState();
      expect(state.isLoadingControlVideo).toBe(false);
      expect(state.controlVideoType).toBeNull();
    });

    it('メイン画面のコントロール動画再生状態が反映される', async () => {
      // 開始動画再生中
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: 'start',
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      let state = getAppState();
      expect(state.controlVideoType).toBe('start');

      // 終了動画再生中
      await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasStarted: true,
            screenMode: 'room',
            isLoadingBackground: false,
            isLoadingControlVideo: false,
            controlVideoType: 'end',
            oneCommeEnabled: false,
            oneCommeConnected: false,
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      state = getAppState();
      expect(state.controlVideoType).toBe('end');
    });
  });

  describe('UI表示切替がメイン画面に反映 (Requirements 5.1, 5.2, 5.3)', () => {
    it('コントロール表示切替が状態に反映される', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsub = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      // コントロール非表示
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'controls', visible: false }),
        })
      );

      unsub();

      // 状態が更新されていることを確認
      expect(getAppState().uiVisibility.controls).toBe(false);

      // コマンドがメイン画面に配信されていることを確認
      expect(receivedCommands.length).toBe(1);
      expect(receivedCommands[0]).toEqual({
        type: 'setUIVisibility',
        target: 'controls',
        visible: false,
      });
    });

    it('チャット履歴表示切替が状態に反映される', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsub = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      // チャット履歴非表示
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'chatHistory', visible: false }),
        })
      );

      unsub();

      expect(getAppState().uiVisibility.chatHistory).toBe(false);
      expect(receivedCommands[0]).toEqual({
        type: 'setUIVisibility',
        target: 'chatHistory',
        visible: false,
      });
    });

    it('チャット入力表示切替が状態に反映される', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsub = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      // チャット入力非表示
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'chatInput', visible: false }),
        })
      );

      unsub();

      expect(getAppState().uiVisibility.chatInput).toBe(false);
      expect(receivedCommands[0]).toEqual({
        type: 'setUIVisibility',
        target: 'chatInput',
        visible: false,
      });
    });

    it('他の設定を維持しながらUI表示設定のみ変更される', async () => {
      // 初期状態をセット
      updateAppState({
        hasStarted: true,
        screenMode: 'room',
        oneCommeEnabled: true,
      });

      // コントロール非表示
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'controls', visible: false }),
        })
      );

      const state = getAppState();
      // 他の設定が維持されていることを確認
      expect(state.hasStarted).toBe(true);
      expect(state.screenMode).toBe('room');
      expect(state.oneCommeEnabled).toBe(true);
      // UI表示設定のみ変更されていることを確認
      expect(state.uiVisibility.controls).toBe(false);
      expect(state.uiVisibility.chatHistory).toBe(true);
      expect(state.uiVisibility.chatInput).toBe(true);
    });
  });

  describe('状態のイミュータビリティ', () => {
    it('getAppStateは状態のコピーを返す', () => {
      updateAppState({ hasStarted: true });

      const state1 = getAppState();
      const state2 = getAppState();

      // 異なるオブジェクトであることを確認
      expect(state1).not.toBe(state2);
      expect(state1.uiVisibility).not.toBe(state2.uiVisibility);

      // しかし値は同じであることを確認
      expect(state1).toEqual(state2);
    });

    it('状態変更が他の取得した状態に影響しない', () => {
      updateAppState({ hasStarted: true });

      const stateBefore = getAppState();
      updateAppState({ screenMode: 'standby' });
      const stateAfter = getAppState();

      // 以前取得した状態は変更されていないことを確認
      expect(stateBefore.screenMode).toBeNull();
      expect(stateAfter.screenMode).toBe('standby');
    });
  });

  describe('複数クライアント間の状態同期', () => {
    it('複数の購読者が独立して動作する', () => {
      const states1: AppState[] = [];
      const states2: AppState[] = [];
      let count3 = 0;

      const unsub1 = subscribe((s) => states1.push({ ...s, uiVisibility: { ...s.uiVisibility } }));
      const unsub2 = subscribe((s) => states2.push({ ...s, uiVisibility: { ...s.uiVisibility } }));
      const unsub3 = subscribe(() => count3++);

      // 最初の更新
      updateAppState({ hasStarted: true });

      // 購読者2を解除
      unsub2();

      // 2回目の更新
      updateAppState({ screenMode: 'room' });

      unsub1();
      unsub3();

      // 購読者1は2回通知を受けた
      expect(states1.length).toBe(2);
      // 購読者2は1回のみ（解除前）
      expect(states2.length).toBe(1);
      // 購読者3は2回
      expect(count3).toBe(2);
    });

    it('コマンド購読者も独立して動作する', async () => {
      const commands1: RemoteCommand[] = [];
      const commands2: RemoteCommand[] = [];

      const unsub1 = subscribeCommand((c) => commands1.push(c));
      const unsub2 = subscribeCommand((c) => commands2.push(c));

      // コマンド1を送信してからunsub2
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
        })
      );

      unsub2();

      // コマンド2を送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'controlVideo', action: 'end' }),
        })
      );

      unsub1();

      // 購読者1は2回
      expect(commands1.length).toBe(2);
      // 購読者2は1回のみ
      expect(commands2.length).toBe(1);
    });
  });

  describe('エラーケースのハンドリング', () => {
    it('不正な状態更新リクエストはエラーを返す', async () => {
      const response = await statePOST(
        new Request('http://localhost/api/remote/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
      );

      expect(response.status).toBe(400);
    });

    it('状態リセット後は初期状態に戻る', () => {
      updateAppState({
        hasStarted: true,
        screenMode: 'room',
        oneCommeEnabled: true,
        uiVisibility: { controls: false, chatHistory: false, chatInput: false },
      });

      resetAppState();

      const state = getAppState();
      expect(state.hasStarted).toBe(false);
      expect(state.screenMode).toBeNull();
      expect(state.oneCommeEnabled).toBe(false);
      expect(state.uiVisibility.controls).toBe(true);
      expect(state.uiVisibility.chatHistory).toBe(true);
      expect(state.uiVisibility.chatInput).toBe(true);
    });
  });
});
