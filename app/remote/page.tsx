'use client';

/**
 * リモート操作ページ
 * @see .kiro/specs/remote-control-panel/design.md - RemoteControlPage
 */

import { useState, useCallback } from 'react';
import { useRemoteSync } from '@/hooks/useRemoteSync';
import ScriptPanel from '@/components/ScriptPanel';
import ScriptAutoSenderPanel from '@/components/ScriptAutoSenderPanel';
import type { Script } from '@/lib/scriptTypes';

export default function RemoteControlPage() {
  const { state, isConnected, error, sendCommand } = useRemoteSync();
  const [isScriptSending, setIsScriptSending] = useState(false);

  // 台本送信ハンドラ（Hookは早期returnより前に定義）
  const handleScriptSend = useCallback(async (script: Script) => {
    if (isScriptSending) return;

    setIsScriptSending(true);
    try {
      await sendCommand({ type: 'sendScript', script });
    } finally {
      setIsScriptSending(false);
    }
  }, [isScriptSending, sendCommand]);

  // 接続待機中
  if (!isConnected && !error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-sm">メイン画面に接続中...</p>
        </div>
      </div>
    );
  }

  // エラー時
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // 画面モードの表示テキスト
  const screenModeText = state?.screenMode === 'standby'
    ? '待機画面'
    : state?.screenMode === 'room'
      ? '初期画面'
      : '未開始';

  // 操作無効化の判定
  const isControlDisabled = state?.isLoadingControlVideo || !!state?.controlVideoType;

  // モード選択ハンドラ
  const handleModeSelect = (mode: 'standby' | 'room') => {
    sendCommand({ type: 'selectMode', mode });
  };

  // コントロールボタンハンドラ
  const handleControlVideo = (action: 'start' | 'end') => {
    sendCommand({ type: 'controlVideo', action });
  };

  // わんコメ連携切替ハンドラ
  const handleToggleOneComme = () => {
    sendCommand({ type: 'toggleOneComme', enabled: !state?.oneCommeEnabled });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">リモート操作パネル</h1>
          <div
            data-testid="connection-status"
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm">接続中</span>
          </div>
        </div>

        {/* 状態表示 */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-white/70 text-sm mb-2">現在の状態</h2>
          <p data-testid="screen-mode" className="text-white">
            {screenModeText}
          </p>

          {/* ローディング状態 */}
          {state?.isLoadingControlVideo && (
            <p data-testid="loading-status" className="text-yellow-400 text-sm mt-2">
              読み込み中...
            </p>
          )}

          {/* 再生中の動画 */}
          {state?.controlVideoType && !state?.isLoadingControlVideo && (
            <p data-testid="playing-status" className="text-blue-400 text-sm mt-2">
              {state.controlVideoType === 'start' ? '開始動画再生中' : '終了動画再生中'}
            </p>
          )}
        </div>

        {/* モード選択（未開始時のみ） */}
        {!state?.hasStarted && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-white/70 text-sm mb-3">画面モード選択</h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleModeSelect('standby')}
                className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                待機画面
              </button>
              <button
                onClick={() => handleModeSelect('room')}
                className="flex-1 px-4 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                初期画面
              </button>
            </div>
          </div>
        )}

        {/* コントロールボタン（開始後のみ） */}
        {state?.hasStarted && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-white/70 text-sm mb-3">コントロール</h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleControlVideo('start')}
                disabled={isControlDisabled}
                className="flex-1 px-4 py-3 text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {state?.isLoadingControlVideo && state?.controlVideoType === 'start'
                  ? '読込中...'
                  : '開始'}
              </button>
              <button
                onClick={() => handleControlVideo('end')}
                disabled={isControlDisabled}
                className="flex-1 px-4 py-3 text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {state?.isLoadingControlVideo && state?.controlVideoType === 'end'
                  ? '読込中...'
                  : '終了'}
              </button>
            </div>
          </div>
        )}

        {/* わんコメ連携（開始後のみ） */}
        {state?.hasStarted && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-white/70 text-sm mb-3">わんコメ連携</h2>
            <div className="flex items-center justify-between">
              <button
                onClick={handleToggleOneComme}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  state?.oneCommeEnabled
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
              >
                わんコメ {state?.oneCommeEnabled ? 'ON' : 'OFF'}
              </button>
              {state?.oneCommeEnabled && (
                <span
                  data-testid="onecomme-status"
                  className={`text-sm ${
                    state?.oneCommeConnected ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {state?.oneCommeConnected ? '接続中' : '接続待ち...'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 台本パネル（開始後のみ） */}
        {state?.hasStarted && (
          <ScriptPanel
            onScriptSend={handleScriptSend}
            isSending={isScriptSending}
          />
        )}

        {/* 台本自動送信パネル（開始後のみ） */}
        {state?.hasStarted && (
          <ScriptAutoSenderPanel
            onScriptSend={handleScriptSend}
            isSending={isScriptSending}
          />
        )}
      </div>
    </div>
  );
}
