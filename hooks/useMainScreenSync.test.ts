/**
 * useMainScreenSync Hook Tests
 * @see .kiro/specs/reliable-remote-control/design.md - useMainScreenSyncPolling
 * Requirements: 1.1, 1.2, 2.2, 3.1, 4.2, 4.3, 4.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useMainScreenSync (Polling)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('コマンドポーリング機能', () => {
    it('マウント時に500ms間隔でコマンド取得APIをポーリングする', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      // 初回ポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/remote/commands');

      // 500ms後に再度ポーリング
      mockFetch.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/remote/commands');
    });

    it('取得したコマンドをFIFO順序で実行する', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const callOrder: string[] = [];

      const onSelectMode = vi.fn((mode) => callOrder.push(`selectMode:${mode}`));
      const onControlVideo = vi.fn((action) => callOrder.push(`controlVideo:${action}`));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [
            { type: 'selectMode', mode: 'room' },
            { type: 'controlVideo', action: 'start' },
            { type: 'selectMode', mode: 'standby' },
          ],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode,
        onControlVideo,
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(callOrder).toEqual([
        'selectMode:room',
        'controlVideo:start',
        'selectMode:standby',
      ]);
    });

    it('接続成功時はisConnectedがtrueになる', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('アンマウント時にポーリングを停止する', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      const { unmount } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      mockFetch.mockClear();
      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('コマンドハンドリング', () => {
    it('selectModeコマンドでonSelectModeコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onSelectMode = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'selectMode', mode: 'standby' }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode,
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onSelectMode).toHaveBeenCalledWith('standby');
    });

    it('controlVideoコマンドでonControlVideoコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onControlVideo = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'controlVideo', action: 'start' }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo,
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onControlVideo).toHaveBeenCalledWith('start');
    });

    it('toggleOneCommeコマンドでonToggleOneCommeコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onToggleOneComme = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'toggleOneComme', enabled: true }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme,
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onToggleOneComme).toHaveBeenCalledWith(true);
    });

    it('setUIVisibilityコマンドでonUIVisibilityChangeコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onUIVisibilityChange = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'setUIVisibility', target: 'controls', visible: false }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange,
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onUIVisibilityChange).toHaveBeenCalledWith('controls', false);
    });

    it('sendScriptコマンドでonSendScriptコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onSendScript = vi.fn();
      const script = { title: 'test', content: 'test content' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'sendScript', script }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
        onSendScript,
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onSendScript).toHaveBeenCalledWith(script);
    });

    it('sendMessageコマンドでonSendMessageコールバックを呼び出す', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onSendMessage = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'sendMessage', message: 'こんにちは', username: 'テストユーザー' }],
        }),
      });

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
        onSendMessage,
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(onSendMessage).toHaveBeenCalledWith('こんにちは', 'テストユーザー');
    });

    it('onSendMessageが未設定でもエラーにならない', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          commands: [{ type: 'sendMessage', message: 'テスト', username: '配信者' }],
        }),
      });

      // onSendMessageを設定せずにhookを使用
      expect(() => {
        renderHook(() => useMainScreenSync({
          onSelectMode: vi.fn(),
          onControlVideo: vi.fn(),
          onToggleOneComme: vi.fn(),
          onUIVisibilityChange: vi.fn(),
        }));
      }).not.toThrow();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    });
  });

  describe('状態報告', () => {
    it('reportStateで状態をAPIに報告する', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const state = {
        hasStarted: true,
        screenMode: 'standby' as const,
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

      await act(async () => {
        await result.current.reportState(state);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"hasStarted":true'),
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('ポーリング失敗時はisConnectedがfalseになる', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('コマンド取得に失敗しました');
    });

    it('ポーリング失敗後も次の間隔で再試行する', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isConnected).toBe(false);

      // 500ms後に再試行
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('エラー時もUIをブロックしない（コールバックは引き続き有効）', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commands: [] }),
      });

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // reportStateはエラー時でも呼び出し可能
      expect(typeof result.current.reportState).toBe('function');
    });
  });
});
