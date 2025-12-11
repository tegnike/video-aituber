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

describe('useRemoteSync（ポーリング方式）', () => {
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
    commentQueue: [],
  };

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ポーリング接続管理', () => {
    it('初期状態ではisConnectedがfalse', () => {
      const { result } = renderHook(() => useRemoteSync());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.state).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('初回ポーリング成功時にisConnectedがtrueになりstateが設定される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result } = renderHook(() => useRemoteSync());

      // 初回ポーリングを実行
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.state).toEqual(initialState);
      expect(result.current.error).toBeNull();
    });

    it('500ms間隔でポーリングが実行される', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result } = renderHook(() => useRemoteSync());

      // 初回ポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 500ms後に2回目
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // さらに500ms後に3回目
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('状態更新がポーリングで反映される', async () => {
      const updatedState: AppState = { ...initialState, hasStarted: true, screenMode: 'room' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialState),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedState),
        });

      const { result } = renderHook(() => useRemoteSync());

      // 初回ポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.state?.hasStarted).toBe(false);

      // 2回目のポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(result.current.state?.hasStarted).toBe(true);
      expect(result.current.state?.screenMode).toBe('room');
    });

    it('ポーリング失敗時にisConnectedがfalseになりerrorが設定される', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRemoteSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it('ポーリング失敗後も次のポーリングで再試行される', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialState),
        });

      const { result } = renderHook(() => useRemoteSync());

      // 初回ポーリング（失敗）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).not.toBeNull();

      // 2回目のポーリング（成功）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('アンマウント時にポーリングが停止される', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { unmount } = renderHook(() => useRemoteSync());

      // 初回ポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      unmount();

      // アンマウント後はポーリングが発生しない
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendCommand', () => {
    it('コマンドを送信できる', async () => {
      // ポーリング用のモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result } = renderHook(() => useRemoteSync());

      // ポーリングを停止してから送信テスト
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

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
      // ポーリング用のモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result } = renderHook(() => useRemoteSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      mockFetch.mockClear();
      // 3回分失敗を設定（リトライ対応）
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(
        act(async () => {
          await result.current.sendCommand({ type: 'controlVideo', action: 'start' });
        })
      ).rejects.toThrow();
    });

    it('コマンド送信失敗時に自動リトライされる', async () => {
      // ポーリング用のモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result } = renderHook(() => useRemoteSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      mockFetch.mockClear();
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      await act(async () => {
        await result.current.sendCommand({ type: 'controlVideo', action: 'start' });
      });

      // 2回呼ばれている（1回目失敗、2回目成功）
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('コマンド送信が最大3回まで再試行される', async () => {
      // ポーリング用のモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(initialState),
      });

      const { result, unmount } = renderHook(() => useRemoteSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // ポーリングを停止
      unmount();

      mockFetch.mockClear();
      // 3回分のネットワークエラーを個別に設定
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      // unmount後もsendCommandは呼べるのでキャプチャ済みの関数を呼ぶ
      const sendCommand = result.current.sendCommand;
      await expect(sendCommand({ type: 'controlVideo', action: 'start' })).rejects.toThrow();

      // 3回試行（1回目 + 2回リトライ）
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
