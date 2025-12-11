'use client';

/**
 * SSE接続管理フック - リアルタイム状態同期
 * @see .kiro/specs/remote-control-panel/design.md - useRemoteSync
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppState, RemoteCommand } from '@/lib/remoteState';

export interface UseRemoteSyncReturn {
  state: AppState | null;
  isConnected: boolean;
  error: string | null;
  sendCommand: (command: RemoteCommand) => Promise<void>;
}

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 3000;

export function useRemoteSync(): UseRemoteSyncReturn {
  const [state, setState] = useState<AppState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // 既存の接続をクローズ
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/remote/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      retryCountRef.current = 0;
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('SSE接続が切断されました');
      eventSource.close();

      // 自動再接続
      if (retryCountRef.current < MAX_RETRY_COUNT) {
        retryCountRef.current++;
        retryTimerRef.current = setTimeout(() => {
          connect();
        }, RETRY_DELAY_MS);
      } else {
        setError('再接続に失敗しました。ページをリロードしてください。');
      }
    };

    eventSource.addEventListener('state-update', (event) => {
      try {
        const newState = JSON.parse(event.data) as AppState;
        setState(newState);
      } catch {
        console.error('Failed to parse state-update event');
      }
    });

    eventSource.addEventListener('command-received', (event) => {
      // コマンド受信時の処理（必要に応じて拡張）
      console.log('Command received:', event.data);
    });
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [connect]);

  const sendCommand = useCallback(async (command: RemoteCommand): Promise<void> => {
    const response = await fetch('/api/remote/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`コマンド送信に失敗しました: ${response.status}`);
    }
  }, []);

  return {
    state,
    isConnected,
    error,
    sendCommand,
  };
}
