/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRemoteSync } from './useRemoteSync';
import type { AppState } from '@/lib/remoteState';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// EventSourceをモック
class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readyState = 0; // CONNECTING
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'state-update' || type === 'command-received') {
      // イベントリスナーを保存
      (this as unknown as Record<string, (event: MessageEvent) => void>)[`_${type}`] = listener;
    }
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // テスト用：接続を開く
  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  // テスト用：状態更新イベントを送信
  simulateStateUpdate(state: AppState) {
    const listener = (this as unknown as Record<string, (event: MessageEvent) => void>)['_state-update'];
    listener?.({ data: JSON.stringify(state) } as MessageEvent);
  }

  // テスト用：エラーを発生
  simulateError() {
    this.readyState = 2; // CLOSED
    this.onerror?.();
  }
}

global.EventSource = MockEventSource as unknown as typeof EventSource;

describe('useRemoteSync', () => {
  const initialState: AppState = {
    hasStarted: false,
    screenMode: null,
    isLoadingBackground: false,
    isLoadingControlVideo: false,
    controlVideoType: null,
    oneCommeEnabled: false,
    oneCommeConnected: false,
    isScriptSending: false,
    uiVisibility: {
      controls: true,
      chatHistory: true,
      chatInput: true,
    },
  };

  beforeEach(() => {
    MockEventSource.instances = [];
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('接続管理', () => {
    it('初期状態ではisConnectedがfalse', () => {
      const { result } = renderHook(() => useRemoteSync());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.state).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('SSE接続成功時にisConnectedがtrueになる', async () => {
      const { result } = renderHook(() => useRemoteSync());

      const eventSource = MockEventSource.instances[0];
      act(() => {
        eventSource.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('状態更新イベント受信時にstateが更新される', async () => {
      const { result } = renderHook(() => useRemoteSync());

      const eventSource = MockEventSource.instances[0];
      act(() => {
        eventSource.simulateOpen();
      });

      const newState: AppState = { ...initialState, hasStarted: true, screenMode: 'standby' };
      act(() => {
        eventSource.simulateStateUpdate(newState);
      });

      expect(result.current.state?.hasStarted).toBe(true);
      expect(result.current.state?.screenMode).toBe('standby');
    });

    it('SSE接続エラー時にerrorが設定される', async () => {
      const { result } = renderHook(() => useRemoteSync());

      const eventSource = MockEventSource.instances[0];
      act(() => {
        eventSource.simulateError();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it('自動再接続が3秒後に試行される', async () => {
      const { result } = renderHook(() => useRemoteSync());

      const eventSource = MockEventSource.instances[0];
      act(() => {
        eventSource.simulateError();
      });

      expect(MockEventSource.instances.length).toBe(1);

      // 3秒後に再接続
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(MockEventSource.instances.length).toBe(2);
    });

    it('アンマウント時にSSE接続がクローズされる', () => {
      const { unmount } = renderHook(() => useRemoteSync());

      const eventSource = MockEventSource.instances[0];
      unmount();

      expect(eventSource.readyState).toBe(2); // CLOSED
    });
  });

  describe('sendCommand', () => {
    it('コマンドを送信できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useRemoteSync());

      await act(async () => {
        await result.current.sendCommand({ type: 'controlVideo', action: 'start' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/remote/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'controlVideo', action: 'start' }),
      });
    });

    it('コマンド送信失敗時にエラーを投げる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { result } = renderHook(() => useRemoteSync());

      await expect(
        act(async () => {
          await result.current.sendCommand({ type: 'controlVideo', action: 'start' });
        })
      ).rejects.toThrow();
    });
  });
});
