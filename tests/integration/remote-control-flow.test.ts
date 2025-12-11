/**
 * リモート操作フローの統合テスト
 * @see .kiro/specs/remote-control-panel/tasks.md - Task 5.1
 *
 * Requirements:
 * - 2.1: リモートパネルで開始ボタン押下 → メイン画面で動画再生
 * - 2.2: リモートパネルで終了ボタン押下 → メイン画面で動画再生
 * - 2.3: リモートパネルで台本送信 → メイン画面で動画生成・再生
 * - 2.4: リモートパネルでわんコメ連携切替 → メイン画面に反映
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as commandPOST } from '@/app/api/remote/command/route';
import { POST as statePOST, GET as stateGET } from '@/app/api/remote/state/route';
import {
  resetAppState,
  getAppState,
  updateAppState,
  subscribe,
  subscribeCommand,
  type RemoteCommand,
  type AppState,
} from '@/lib/remoteState';

describe('リモート操作フロー統合テスト', () => {
  beforeEach(() => {
    resetAppState();
  });

  describe('開始/終了ボタン操作フロー (Requirements 2.1, 2.2)', () => {
    it('リモートパネルから開始コマンド送信 → 状態が更新される', async () => {
      // リモートパネルから開始コマンドを送信
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      // 状態が更新されていることを確認
      const state = getAppState();
      expect(state.controlVideoType).toBe('start');
    });

    it('コマンド送信時にコマンド購読者が通知を受け取る', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
      });

      await commandPOST(request);
      unsubscribe();

      // メイン画面がコマンドを受信できることを確認
      expect(receivedCommands.length).toBe(1);
      expect(receivedCommands[0]).toEqual({ type: 'controlVideo', action: 'start' });
    });

    it('リモートパネルから終了コマンド送信 → 状態が更新される', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'end' }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.controlVideoType).toBe('end');
    });

    it('メイン画面が状態報告 → リモートパネルで取得可能', async () => {
      // メイン画面が動画再生開始を報告
      const reportRequest = new Request('http://localhost/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasStarted: true,
          screenMode: 'room',
          isLoadingControlVideo: false,
          controlVideoType: 'start',
          isLoadingBackground: false,
          oneCommeEnabled: false,
          oneCommeConnected: false,
          isScriptSending: false,
          uiVisibility: { controls: true, chatHistory: true, chatInput: true },
        } as AppState),
      });

      const reportResponse = await statePOST(reportRequest);
      expect(reportResponse.status).toBe(200);

      // リモートパネルが状態を取得できることを確認
      const getRequest = new Request('http://localhost/api/remote/state', {
        method: 'GET',
      });
      const getResponse = await stateGET(getRequest);
      const state = await getResponse.json();

      expect(state.controlVideoType).toBe('start');
      expect(state.hasStarted).toBe(true);
    });
  });

  describe('台本送信フロー (Requirement 2.3)', () => {
    it('リモートパネルから台本送信コマンド → 状態が更新される', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sendScript', scriptId: 'test-script-123' }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.isScriptSending).toBe(true);
    });

    it('台本送信コマンドがメイン画面に配信される', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sendScript', scriptId: 'test-script-456' }),
      });

      await commandPOST(request);
      unsubscribe();

      expect(receivedCommands.length).toBe(1);
      expect(receivedCommands[0]).toEqual({ type: 'sendScript', scriptId: 'test-script-456' });
    });

    it('台本送信後、動画生成完了状態を報告できる', async () => {
      // 台本送信
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sendScript', scriptId: 'script-1' }),
        })
      );

      // 動画生成完了を報告
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

      const state = getAppState();
      expect(state.isScriptSending).toBe(false);
    });
  });

  describe('わんコメ連携切替フロー (Requirement 2.4)', () => {
    it('リモートパネルからわんコメON → メイン画面に反映', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleOneComme', enabled: true }),
      });

      const response = await commandPOST(request);
      unsubscribe();

      expect(response.status).toBe(200);

      // 状態が更新されていることを確認
      const state = getAppState();
      expect(state.oneCommeEnabled).toBe(true);

      // コマンドがメイン画面に配信されていることを確認
      expect(receivedCommands.length).toBe(1);
      expect(receivedCommands[0]).toEqual({ type: 'toggleOneComme', enabled: true });
    });

    it('リモートパネルからわんコメOFF → メイン画面に反映', async () => {
      // 先にONにしておく
      updateAppState({ oneCommeEnabled: true });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleOneComme', enabled: false }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.oneCommeEnabled).toBe(false);
    });

    it('メイン画面がわんコメ接続状態を報告 → リモートパネルで確認可能', async () => {
      // わんコメONにする
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'toggleOneComme', enabled: true }),
        })
      );

      // メイン画面がわんコメ接続成功を報告
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
            oneCommeConnected: true, // 接続成功
            isScriptSending: false,
            uiVisibility: { controls: true, chatHistory: true, chatInput: true },
          } as AppState),
        })
      );

      // リモートパネルで状態を取得
      const getResponse = await stateGET(new Request('http://localhost/api/remote/state'));
      const state = await getResponse.json();

      expect(state.oneCommeEnabled).toBe(true);
      expect(state.oneCommeConnected).toBe(true);
    });
  });

  describe('画面モード選択フロー (Requirements 3.1, 3.2)', () => {
    it('リモートパネルから待機画面選択 → メイン画面に反映', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'selectMode', mode: 'standby' }),
      });

      const response = await commandPOST(request);
      unsubscribe();

      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.screenMode).toBe('standby');
      expect(state.hasStarted).toBe(true);

      // コマンドが配信されていることを確認
      expect(receivedCommands[0]).toEqual({ type: 'selectMode', mode: 'standby' });
    });

    it('リモートパネルから初期画面選択 → メイン画面に反映', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'selectMode', mode: 'room' }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.screenMode).toBe('room');
      expect(state.hasStarted).toBe(true);
    });
  });

  describe('UI表示切替フロー (Requirements 5.1, 5.2, 5.3)', () => {
    it('リモートパネルからコントロール非表示 → メイン画面に反映', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'controls', visible: false }),
      });

      const response = await commandPOST(request);
      unsubscribe();

      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.controls).toBe(false);

      // コマンドが配信されていることを確認
      expect(receivedCommands[0]).toEqual({
        type: 'setUIVisibility',
        target: 'controls',
        visible: false,
      });
    });

    it('リモートパネルからチャット履歴非表示 → メイン画面に反映', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'chatHistory', visible: false }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.chatHistory).toBe(false);
    });

    it('リモートパネルからチャット入力非表示 → メイン画面に反映', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'chatInput', visible: false }),
      });

      const response = await commandPOST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.chatInput).toBe(false);
    });

    it('複数のUI表示設定を順次変更できる', async () => {
      // 全て非表示にする
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'controls', visible: false }),
        })
      );
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'chatHistory', visible: false }),
        })
      );
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setUIVisibility', target: 'chatInput', visible: false }),
        })
      );

      const state = getAppState();
      expect(state.uiVisibility.controls).toBe(false);
      expect(state.uiVisibility.chatHistory).toBe(false);
      expect(state.uiVisibility.chatInput).toBe(false);
    });
  });

  describe('操作フローの連携', () => {
    it('完全な配信開始フロー: モード選択 → 開始コマンド → 状態報告', async () => {
      const receivedCommands: RemoteCommand[] = [];
      const unsubscribe = subscribeCommand((cmd) => {
        receivedCommands.push(cmd);
      });

      // Step 1: モード選択
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'selectMode', mode: 'room' }),
        })
      );

      expect(getAppState().hasStarted).toBe(true);
      expect(getAppState().screenMode).toBe('room');

      // Step 2: 開始コマンド
      await commandPOST(
        new Request('http://localhost/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
        })
      );

      expect(getAppState().controlVideoType).toBe('start');

      // Step 3: メイン画面が再生中を報告
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

      unsubscribe();

      // 全てのコマンドが配信されたことを確認
      expect(receivedCommands.length).toBe(2);
      expect(receivedCommands[0].type).toBe('selectMode');
      expect(receivedCommands[1].type).toBe('controlVideo');
    });
  });
});
