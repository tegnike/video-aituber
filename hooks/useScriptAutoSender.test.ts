/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptAutoSender } from './useScriptAutoSender';
import type { Script } from '@/lib/scriptTypes';

describe('useScriptAutoSender', () => {
  // モックonScriptSend関数
  const mockOnScriptSend = vi.fn<[Script], Promise<void>>();

  // テスト用の台本データ
  const testScripts: Script[] = [
    { id: 'test-1', label: 'テスト1', text: 'テストメッセージ1' },
    { id: 'test-2', label: 'テスト2', text: 'テストメッセージ2' },
    { id: 'test-3', label: 'テスト3', text: 'テストメッセージ3' },
  ];

  // テスト用のモックFileオブジェクト
  const createMockFile = (content: object | string, filename = 'test.json') => {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return {
      name: filename,
      type: 'application/json',
      text: () => Promise.resolve(text),
    } as unknown as File;
  };

  beforeEach(() => {
    mockOnScriptSend.mockReset();
    mockOnScriptSend.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      expect(result.current.status).toBe('idle');
      expect(result.current.sequence).toBeNull();
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.interval).toBe(5); // DEFAULT_SEND_INTERVAL
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadSequence - シーケンスファイル読み込み', () => {
    it('正常なJSONファイルを読み込める', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({
        name: 'テストシーケンス',
        scripts: testScripts,
        defaultInterval: 10,
      });

      await act(async () => {
        await result.current.loadSequence(file);
      });

      expect(result.current.sequence?.name).toBe('テストシーケンス');
      expect(result.current.sequence?.scripts).toHaveLength(3);
      expect(result.current.interval).toBe(10); // defaultIntervalが適用される
      expect(result.current.error).toBeNull();
    });

    it('scriptsプロパティがない場合はエラー', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ name: 'invalid' });

      await act(async () => {
        await result.current.loadSequence(file);
      });

      expect(result.current.sequence).toBeNull();
      expect(result.current.error).toBe('scriptsプロパティが見つかりません');
    });

    it('空のscripts配列の場合はエラー', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: [] });

      await act(async () => {
        await result.current.loadSequence(file);
      });

      expect(result.current.sequence).toBeNull();
      expect(result.current.error).toBe('台本が1件以上必要です');
    });

    it('不正なJSON形式の場合はエラー', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile('invalid json', 'invalid.json');

      await act(async () => {
        await result.current.loadSequence(file);
      });

      expect(result.current.sequence).toBeNull();
      expect(result.current.error).toContain('ファイルの形式が不正です');
    });
  });

  describe('clearSequence - シーケンスクリア', () => {
    it('シーケンスをクリアできる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      expect(result.current.sequence).not.toBeNull();

      act(() => {
        result.current.clearSequence();
      });

      expect(result.current.sequence).toBeNull();
      expect(result.current.status).toBe('idle');
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('start/stop - 開始・停止', () => {
    it('シーケンス読み込み後に開始できる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('running');
    });

    it('シーケンスがない状態では開始できない', () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('idle');
    });

    it('stopでstatusがidleに戻りcurrentIndexがリセットされる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      // currentIndexを進める
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('pause/resume - 一時停止・再開', () => {
    it('running中にpauseでpausedになる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.status).toBe('paused');
    });

    it('paused中にresumeでrunningに戻る', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.resume();
      });

      expect(result.current.status).toBe('running');
    });

    it('pauseで現在のインデックスが保持される', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts, defaultInterval: 0 });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      // 最初の送信を完了させる
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      const indexBeforePause = result.current.currentIndex;

      act(() => {
        result.current.pause();
      });

      expect(result.current.currentIndex).toBe(indexBeforePause);
    });
  });

  describe('setInterval - 送信間隔設定', () => {
    it('送信間隔を変更できる', () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      act(() => {
        result.current.setInterval(10);
      });

      expect(result.current.interval).toBe(10);
    });

    it('負の値は0に正規化される', () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      act(() => {
        result.current.setInterval(-5);
      });

      expect(result.current.interval).toBe(0);
    });
  });

  describe('自動送信フロー', () => {
    it('全台本を順次送信し完了時にstatusがcompletedになる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts, defaultInterval: 0 });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      // 全台本送信完了まで待つ
      await act(async () => {
        for (let i = 0; i < testScripts.length + 1; i++) {
          await vi.runOnlyPendingTimersAsync();
        }
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(3);
      expect(mockOnScriptSend).toHaveBeenNthCalledWith(1, testScripts[0]);
      expect(mockOnScriptSend).toHaveBeenNthCalledWith(2, testScripts[1]);
      expect(mockOnScriptSend).toHaveBeenNthCalledWith(3, testScripts[2]);
      expect(result.current.status).toBe('completed');
    });

    it('isSendingがtrueの間は次の送信を待機する', async () => {
      let isSending = false;
      const { result, rerender } = renderHook(
        ({ sending }) => useScriptAutoSender(mockOnScriptSend, sending),
        { initialProps: { sending: isSending } }
      );

      const file = createMockFile({ scripts: testScripts, defaultInterval: 0 });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      // 送信開始
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      // isSendingをtrueに
      isSending = true;
      rerender({ sending: isSending });

      // タイマーを進めても送信されない
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(1);

      // isSendingをfalseに
      isSending = false;
      rerender({ sending: isSending });

      // 次の送信が開始される
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(2);
    });

    it('設定した間隔分の待機が行われる', async () => {
      const { result } = renderHook(() => useScriptAutoSender(mockOnScriptSend, false));

      const file = createMockFile({ scripts: testScripts, defaultInterval: 3 });
      await act(async () => {
        await result.current.loadSequence(file);
      });

      act(() => {
        result.current.start();
      });

      // 最初の送信
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(1);

      // 2秒後はまだ送信されない
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(1);

      // 3秒後に送信される
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockOnScriptSend).toHaveBeenCalledTimes(2);
    });
  });
});
