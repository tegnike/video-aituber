import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  Script,
  ScriptSequence,
  AutoSenderStatus,
  AutoSenderState,
  AutoSenderActions,
} from '@/lib/scriptTypes';
import { parseScriptSequence, DEFAULT_SEND_INTERVAL } from '@/lib/scriptTypes';

/**
 * 台本シーケンスの自動送信を管理するカスタムHook
 * @param onScriptSend - 台本送信関数
 * @param isSending - 外部から渡される送信中状態
 * @returns 状態とアクション
 */
export function useScriptAutoSender(
  onScriptSend: (script: Script) => Promise<void>,
  isSending: boolean
): AutoSenderState & AutoSenderActions {
  // 状態管理
  const [status, setStatus] = useState<AutoSenderStatus>('idle');
  const [sequence, setSequence] = useState<ScriptSequence | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interval, setIntervalState] = useState(DEFAULT_SEND_INTERVAL);
  const [error, setError] = useState<string | null>(null);

  // 内部参照（クロージャ問題回避用）
  const statusRef = useRef(status);
  const sequenceRef = useRef(sequence);
  const currentIndexRef = useRef(currentIndex);
  const intervalRef = useRef(interval);
  const isSendingRef = useRef(isSending);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingForSendRef = useRef(false);

  // 参照を同期
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);
  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  // タイマークリア
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 次の台本を送信
  const sendNext = useCallback(async () => {
    const seq = sequenceRef.current;
    const idx = currentIndexRef.current;

    if (!seq || idx >= seq.scripts.length) {
      setStatus('completed');
      return;
    }

    if (statusRef.current !== 'running') {
      return;
    }

    // isSendingがtrueの場合は待機
    if (isSendingRef.current) {
      waitingForSendRef.current = true;
      return;
    }

    const script = seq.scripts[idx];
    try {
      await onScriptSend(script);
      // 次のインデックスへ
      const nextIndex = idx + 1;
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;

      if (nextIndex >= seq.scripts.length) {
        setStatus('completed');
        return;
      }

      // 間隔待機後に次を送信
      if (statusRef.current === 'running') {
        timerRef.current = setTimeout(() => {
          sendNext();
        }, intervalRef.current * 1000);
      }
    } catch (err) {
      console.error('送信エラー:', err);
      setError(err instanceof Error ? err.message : '送信中にエラーが発生しました');
      setStatus('paused');
    }
  }, [onScriptSend]);

  // isSending監視
  useEffect(() => {
    // isSendingがfalseになった時、待機中なら送信を再開
    if (!isSending && waitingForSendRef.current && statusRef.current === 'running') {
      waitingForSendRef.current = false;
      // 少し遅延させて状態を安定させる
      timerRef.current = setTimeout(() => {
        sendNext();
      }, 100);
    }
  }, [isSending, sendNext]);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // ファイル読み込み
  const loadSequence = useCallback(async (file: File): Promise<void> => {
    setError(null);

    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setError('ファイルの形式が不正です: JSONパースに失敗しました');
        setSequence(null);
        return;
      }

      const result = parseScriptSequence(data);
      if (result.error) {
        setError(result.error);
        setSequence(null);
        return;
      }

      if (result.sequence) {
        setSequence(result.sequence);
        // defaultIntervalがあれば適用
        if (result.sequence.defaultInterval !== undefined) {
          setIntervalState(result.sequence.defaultInterval);
          intervalRef.current = result.sequence.defaultInterval;
        }
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        setStatus('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイル読み込みエラー');
      setSequence(null);
    }
  }, []);

  // 開始
  const start = useCallback(() => {
    if (!sequenceRef.current || statusRef.current === 'running') {
      return;
    }

    setStatus('running');
    statusRef.current = 'running';
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setError(null);

    // 即座に最初の送信を開始
    timerRef.current = setTimeout(() => {
      sendNext();
    }, 0);
  }, [sendNext]);

  // 一時停止
  const pause = useCallback(() => {
    if (statusRef.current !== 'running') {
      return;
    }
    clearTimer();
    waitingForSendRef.current = false;
    setStatus('paused');
    statusRef.current = 'paused';
  }, [clearTimer]);

  // 再開
  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') {
      return;
    }
    setStatus('running');
    statusRef.current = 'running';
    setError(null);

    // 再開時はすぐに次を送信
    timerRef.current = setTimeout(() => {
      sendNext();
    }, 0);
  }, [sendNext]);

  // 停止
  const stop = useCallback(() => {
    clearTimer();
    waitingForSendRef.current = false;
    setStatus('idle');
    statusRef.current = 'idle';
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setError(null);
  }, [clearTimer]);

  // 送信間隔設定
  const setIntervalValue = useCallback((seconds: number) => {
    const normalizedValue = Math.max(0, seconds);
    setIntervalState(normalizedValue);
    intervalRef.current = normalizedValue;
  }, []);

  // シーケンスクリア
  const clearSequence = useCallback(() => {
    clearTimer();
    waitingForSendRef.current = false;
    setSequence(null);
    sequenceRef.current = null;
    setStatus('idle');
    statusRef.current = 'idle';
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setError(null);
  }, [clearTimer]);

  return {
    // State
    status,
    sequence,
    currentIndex,
    interval,
    error,
    // Actions
    loadSequence,
    start,
    pause,
    resume,
    stop,
    setInterval: setIntervalValue,
    clearSequence,
  };
}
