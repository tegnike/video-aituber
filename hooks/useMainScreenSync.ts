'use client';

/**
 * メイン画面用ポーリングフック - リモートからのコマンドをポーリングで受信
 * @see .kiro/specs/reliable-remote-control/design.md - useMainScreenSyncPolling
 * Requirements: 1.1, 1.2, 2.2, 3.1, 4.2, 4.3, 4.4
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AppState, RemoteCommand } from '@/lib/remoteState';
import type { Script } from '@/lib/scriptTypes';

export interface UseMainScreenSyncOptions {
  onSelectMode: (mode: 'standby' | 'room') => void;
  onControlVideo: (action: 'start' | 'end') => void;
  onToggleOneComme: (enabled: boolean) => void;
  onUIVisibilityChange: (target: 'controls' | 'chatHistory' | 'chatInput', visible: boolean) => void;
  onSendScript?: (script: Script) => void;
}

export interface UseMainScreenSyncReturn {
  isConnected: boolean;
  error: string | null;
  reportState: (state: AppState) => Promise<void>;
}

const POLLING_INTERVAL_MS = 500;

export function useMainScreenSync(options: UseMainScreenSyncOptions): UseMainScreenSyncReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

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
        callbacksRef.current.onSendScript?.(command.script);
        break;
    }
  }, []);

  const pollCommands = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const response = await fetch('/api/remote/commands');
      if (!response.ok) {
        throw new Error(`コマンド取得に失敗しました: ${response.status}`);
      }
      const { commands } = await response.json() as { commands: RemoteCommand[] };

      if (isMountedRef.current) {
        // FIFO順序でコマンドを実行
        for (const command of commands) {
          handleCommand(command);
        }

        setIsConnected(true);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsConnected(false);
        setError('コマンド取得に失敗しました');
      }
    }

    // 次のポーリングをスケジュール
    if (isMountedRef.current) {
      pollingTimerRef.current = setTimeout(pollCommands, POLLING_INTERVAL_MS);
    }
  }, [handleCommand]);

  useEffect(() => {
    isMountedRef.current = true;

    // 初回ポーリングを即座に実行
    pollCommands();

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [pollCommands]);

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
