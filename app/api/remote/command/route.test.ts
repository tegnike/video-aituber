import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './route';
import { resetAppState, getAppState, type RemoteCommand } from '@/lib/remoteState';
import { clearCommandQueue, dequeueAllCommands } from '@/lib/commandQueue';

describe('/api/remote/command', () => {
  beforeEach(() => {
    resetAppState();
    clearCommandQueue();
  });

  describe('selectMode コマンド', () => {
    it('画面モードを standby に設定できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'selectMode', mode: 'standby' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.screenMode).toBe('standby');
      expect(state.hasStarted).toBe(true);
    });

    it('画面モードを room に設定できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'selectMode', mode: 'room' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.screenMode).toBe('room');
    });
  });

  describe('controlVideo コマンド', () => {
    it('コントロール動画を start に設定できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.controlVideoType).toBe('start');
    });

    it('コントロール動画を end に設定できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'end' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.controlVideoType).toBe('end');
    });
  });

  describe('toggleOneComme コマンド', () => {
    it('わんコメ連携を有効にできる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleOneComme', enabled: true }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.oneCommeEnabled).toBe(true);
    });

    it('わんコメ連携を無効にできる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleOneComme', enabled: false }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.oneCommeEnabled).toBe(false);
    });
  });

  describe('setUIVisibility コマンド', () => {
    it('controls の表示を切り替えられる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'controls', visible: false }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.controls).toBe(false);
    });

    it('chatHistory の表示を切り替えられる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'chatHistory', visible: false }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.chatHistory).toBe(false);
    });

    it('chatInput の表示を切り替えられる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'setUIVisibility', target: 'chatInput', visible: false }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.uiVisibility.chatInput).toBe(false);
    });
  });

  describe('sendScript コマンド', () => {
    it('台本送信状態を設定できる', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sendScript', script: { id: 'test-script-1', text: 'テスト台本' } }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.command.script.id).toBe('test-script-1');
    });
  });

  describe('バリデーション', () => {
    it('不正なJSONでエラーを返す', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('不正なコマンドタイプでエラーを返す', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invalidCommand' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('selectMode で不正なモードでエラーを返す', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'selectMode', mode: 'invalid' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('コマンドキューへの追加', () => {
    it('コマンド処理時にコマンドキューに追加される', async () => {
      const request = new Request('http://localhost/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
      });

      await POST(request);

      const commands = dequeueAllCommands();
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual({ type: 'controlVideo', action: 'start' });
    });
  });
});
