import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { resetAppState, getAppState, updateAppState } from '@/lib/remoteState';

describe('/api/remote/state', () => {
  beforeEach(() => {
    resetAppState();
  });

  describe('GET', () => {
    it('現在の状態を返す', async () => {
      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.hasStarted).toBe(false);
      expect(json.screenMode).toBeNull();
    });

    it('更新後の状態を返す', async () => {
      updateAppState({ hasStarted: true, screenMode: 'standby' });

      const response = await GET();
      const json = await response.json();

      expect(json.hasStarted).toBe(true);
      expect(json.screenMode).toBe('standby');
    });
  });

  describe('POST', () => {
    it('状態を更新できる', async () => {
      const request = new Request('http://localhost/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasStarted: true }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      const state = getAppState();
      expect(state.hasStarted).toBe(true);
    });

    it('複数フィールドを更新できる', async () => {
      const request = new Request('http://localhost/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasStarted: true,
          screenMode: 'room',
          isLoadingControlVideo: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const state = getAppState();
      expect(state.hasStarted).toBe(true);
      expect(state.screenMode).toBe('room');
      expect(state.isLoadingControlVideo).toBe(true);
    });

    it('不正なJSONでエラーを返す', async () => {
      const request = new Request('http://localhost/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
