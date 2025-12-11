'use client';

/**
 * ポーリング方式の状態同期フック
 * @see .kiro/specs/reliable-remote-control/design.md - useRemoteSyncPolling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppState, RemoteCommand } from '@/lib/remoteState';

export interface UseRemoteSyncReturn {
  state: AppState | null;
  isConnected: boolean;
  error: string | null;
  sendCommand: (command: RemoteCommand) => Promise<void>;
}

const POLLING_INTERVAL_MS = 500;
const MAX_RETRY_COUNT = 3;

export function useRemoteSync(): UseRemoteSyncReturn {
  const [state, setState] = useState<AppState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  const pollState = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const response = await fetch('/api/remote/state');
      if (!response.ok) {
        throw new Error(`状態取得に失敗しました: ${response.status}`);
      }
      const newState = await response.json() as AppState;

      if (isMountedRef.current) {
        setState(newState);
        setIsConnected(true);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsConnected(false);
        setError(err instanceof Error ? err.message : '状態取得に失敗しました');
      }
    }

    // 次のポーリングをスケジュール
    if (isMountedRef.current) {
      pollingTimerRef.current = setTimeout(pollState, POLLING_INTERVAL_MS);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // 初回ポーリングを即座に実行
    pollState();

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [pollState]);

  const sendCommand = useCallback(async (command: RemoteCommand): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
      try {
        const response = await fetch('/api/remote/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          // HTTPエラーは即座に投げる（リトライしない）
          throw new Error(`コマンド送信に失敗しました: ${response.status}`);
        }

        return; // 成功したら終了
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('コマンド送信に失敗しました');

        // HTTPエラー（response.okがfalse）の場合はリトライしない
        if (lastError.message.includes('コマンド送信に失敗しました:')) {
          throw lastError;
        }

        // ネットワークエラーの場合はリトライ（最後の試行以外）
        if (attempt >= MAX_RETRY_COUNT - 1) {
          throw lastError;
        }
      }
    }

    // 全リトライ失敗時
    throw lastError;
  }, []);

  return {
    state,
    isConnected,
    error,
    sendCommand,
  };
}
