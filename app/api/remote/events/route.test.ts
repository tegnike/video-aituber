import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from './route';
import { resetAppState, updateAppState, broadcastCommand } from '@/lib/remoteState';

describe('/api/remote/events (SSE)', () => {
  beforeEach(() => {
    resetAppState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('SSEレスポンスのContent-Typeが正しい', async () => {
      const request = new Request('http://localhost/api/remote/events');
      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('接続時に初期状態を送信する', async () => {
      const request = new Request('http://localhost/api/remote/events');
      const response = await GET(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain('event: state-update');
      expect(text).toContain('"hasStarted":false');

      reader.cancel();
    });

    it('状態変更時にイベントを送信する', async () => {
      const request = new Request('http://localhost/api/remote/events');
      const response = await GET(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // 初期状態を読み込み
      await reader.read();

      // 状態を更新（購読者に通知される）
      updateAppState({ hasStarted: true, screenMode: 'standby' });

      // イベントを待つ
      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain('event: state-update');
      expect(text).toContain('"hasStarted":true');
      expect(text).toContain('"screenMode":"standby"');

      reader.cancel();
    });

    it('コマンド配信時にイベントを送信する', async () => {
      const request = new Request('http://localhost/api/remote/events');
      const response = await GET(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // 初期状態を読み込み
      await reader.read();

      // コマンドを配信
      broadcastCommand({ type: 'controlVideo', action: 'start' });

      // イベントを待つ
      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain('event: command-received');
      expect(text).toContain('"type":"controlVideo"');
      expect(text).toContain('"action":"start"');

      reader.cancel();
    });
  });
});
