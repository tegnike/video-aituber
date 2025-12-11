/**
 * useMainScreenSync Hook Tests
 * @see .kiro/specs/remote-control-panel/design.md - HomePage Extensions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Map<string, (event: { data: string }) => void> = new Map();
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate connection success after microtask
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    this.listeners.set(type, listener);
  }

  close() {
    this.readyState = 2;
  }

  // Test helper to simulate events
  simulateEvent(type: string, data: unknown) {
    const listener = this.listeners.get(type);
    if (listener) {
      listener({ data: JSON.stringify(data) });
    }
  }

  simulateError() {
    this.readyState = 2;
    this.onerror?.();
  }

  static reset() {
    MockEventSource.instances = [];
  }
}

// @ts-expect-error - Mock global EventSource
global.EventSource = MockEventSource;

describe('useMainScreenSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('SSE connection', () => {
    it('should connect to SSE endpoint on mount', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(MockEventSource.instances.length).toBe(1);
      expect(MockEventSource.instances[0].url).toBe('/api/remote/events');
      expect(result.current.isConnected).toBe(true);
    });

    it('should update isConnected to false on error', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate error without running all timers (which would trigger reconnect + onopen)
      act(() => {
        MockEventSource.instances[0].simulateError();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('SSE接続が切断されました');
    });

    it('should close connection on unmount', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      const { result, unmount } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isConnected).toBe(true);

      unmount();

      expect(MockEventSource.instances[0].readyState).toBe(2); // CLOSED
    });
  });

  describe('command handling', () => {
    it('should call onSelectMode when selectMode command is received', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onSelectMode = vi.fn();

      renderHook(() => useMainScreenSync({
        onSelectMode,
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        MockEventSource.instances[0].simulateEvent('command-received', {
          type: 'selectMode',
          mode: 'standby',
        });
      });

      expect(onSelectMode).toHaveBeenCalledWith('standby');
    });

    it('should call onControlVideo when controlVideo command is received', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onControlVideo = vi.fn();

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo,
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        MockEventSource.instances[0].simulateEvent('command-received', {
          type: 'controlVideo',
          action: 'start',
        });
      });

      expect(onControlVideo).toHaveBeenCalledWith('start');
    });

    it('should call onToggleOneComme when toggleOneComme command is received', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onToggleOneComme = vi.fn();

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme,
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        MockEventSource.instances[0].simulateEvent('command-received', {
          type: 'toggleOneComme',
          enabled: true,
        });
      });

      expect(onToggleOneComme).toHaveBeenCalledWith(true);
    });

    it('should call onUIVisibilityChange when setUIVisibility command is received', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');
      const onUIVisibilityChange = vi.fn();

      renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange,
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        MockEventSource.instances[0].simulateEvent('command-received', {
          type: 'setUIVisibility',
          target: 'controls',
          visible: false,
        });
      });

      expect(onUIVisibilityChange).toHaveBeenCalledWith('controls', false);
    });
  });

  describe('state reporting', () => {
    it('should report state to API when reportState is called', async () => {
      const { useMainScreenSync } = await import('./useMainScreenSync');
      const { renderHook, act } = await import('@testing-library/react');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useMainScreenSync({
        onSelectMode: vi.fn(),
        onControlVideo: vi.fn(),
        onToggleOneComme: vi.fn(),
        onUIVisibilityChange: vi.fn(),
      }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await result.current.reportState({
          hasStarted: true,
          screenMode: 'standby',
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
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/remote/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"hasStarted":true'),
      });
    });
  });
});
