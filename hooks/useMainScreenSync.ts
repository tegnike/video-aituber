'use client';

/**
 * メイン画面用SSE購読フック - リモートからのコマンドを受信
 * @see .kiro/specs/remote-control-panel/design.md - HomePage Extensions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppState, RemoteCommand } from '@/lib/remoteState';

export interface UseMainScreenSyncOptions {
  onSelectMode: (mode: 'standby' | 'room') => void;
  onControlVideo: (action: 'start' | 'end') => void;
  onToggleOneComme: (enabled: boolean) => void;
  onUIVisibilityChange: (target: 'controls' | 'chatHistory' | 'chatInput', visible: boolean) => void;
  onSendScript?: (scriptId: string) => void;
}

export interface UseMainScreenSyncReturn {
  isConnected: boolean;
  error: string | null;
  reportState: (state: AppState) => Promise<void>;
}

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_MS = 3000;

export function useMainScreenSync(options: UseMainScreenSyncOptions): UseMainScreenSyncReturn {
  const { onSelectMode, onControlVideo, onToggleOneComme, onUIVisibilityChange } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useRefでコールバックを保持して再レンダリング問題を回避
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const handleCommand = useCallback((command: RemoteCommand) => {
    switch (command.type) {
      case 'selectMode':
        callbacksRef.current.onSelectMode(command.mode);
        break;
      case 'controlVideo':
        callbacksRef.current.onControlVideo(command.action);
        break;
      case 'toggleOneComme':
        callbacksRef.current.onToggleOneComme(command.enabled);
        break;
      case 'setUIVisibility':
        callbacksRef.current.onUIVisibilityChange(command.target, command.visible);
        break;
      case 'sendScript':
        callbacksRef.current.onSendScript?.(command.scriptId);
        break;
    }
  }, []);

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

    eventSource.addEventListener('command-received', (event) => {
      try {
        const command = JSON.parse(event.data) as RemoteCommand;
        handleCommand(command);
      } catch {
        console.error('Failed to parse command-received event');
      }
    });
  }, [handleCommand]);

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

  const reportState = useCallback(async (state: AppState): Promise<void> => {
    const response = await fetch('/api/remote/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    if (!response.ok) {
      throw new Error(`状態報告に失敗しました: ${response.status}`);
    }
  }, []);

  return {
    isConnected,
    error,
    reportState,
  };
}
