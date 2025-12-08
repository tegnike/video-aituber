'use client';

import { useState, useEffect, useCallback } from 'react';
import { Script } from '@/lib/scriptTypes';

interface ScriptPanelProps {
  /** 台本送信時のコールバック */
  onScriptSend: (script: Script) => Promise<void>;
  /** 送信中かどうか（外部から制御） */
  isSending?: boolean;
}

interface ScriptPanelState {
  scripts: Script[];
  selectedScript: Script | null;
  isLoading: boolean;
  error: string | null;
}

export default function ScriptPanel({
  onScriptSend,
  isSending = false,
}: ScriptPanelProps) {
  const [state, setState] = useState<ScriptPanelState>({
    scripts: [],
    selectedScript: null,
    isLoading: true,
    error: null,
  });

  // 台本一覧を取得
  const fetchScripts = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('/api/scripts');
      if (!response.ok) {
        throw new Error('台本の取得に失敗しました');
      }
      const data = await response.json();
      setState((prev) => ({
        ...prev,
        scripts: data.scripts || [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching scripts:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '台本の取得に失敗しました',
      }));
    }
  }, []);

  // 初回マウント時に台本を取得
  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  // 台本を選択
  const handleSelect = useCallback((script: Script) => {
    setState((prev) => ({
      ...prev,
      selectedScript: prev.selectedScript?.id === script.id ? null : script,
      error: null,
    }));
  }, []);

  // 送信ボタンのクリック
  const handleSend = useCallback(async () => {
    if (!state.selectedScript || isSending) return;

    setState((prev) => ({ ...prev, error: null }));

    try {
      await onScriptSend(state.selectedScript);
    } catch (error) {
      console.error('Error sending script:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : '送信に失敗しました',
      }));
    }
  }, [state.selectedScript, isSending, onScriptSend]);

  // 再試行
  const handleRetry = useCallback(() => {
    if (state.error) {
      fetchScripts();
    }
  }, [state.error, fetchScripts]);

  return (
    <div className="flex flex-col gap-3 p-3 bg-black/60 rounded-xl backdrop-blur-sm max-w-xs">
      <h2 className="text-white text-sm font-bold">台本</h2>

      {/* ローディング表示 */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* エラー表示 */}
      {state.error && !state.isLoading && (
        <div className="flex flex-col gap-2">
          <p className="text-red-400 text-xs">{state.error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-xs text-white bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {/* 台本一覧 */}
      {!state.isLoading && !state.error && (
        <>
          {state.scripts.length === 0 ? (
            <p className="text-white/50 text-xs">台本がありません</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {state.scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => handleSelect(script)}
                  className={`px-3 py-2 text-left text-sm rounded transition-colors ${
                    state.selectedScript?.id === script.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {script.label}
                </button>
              ))}
            </div>
          )}

          {/* プレビュー */}
          {state.selectedScript && (
            <div className="mt-2 p-2 bg-white/10 rounded">
              <p className="text-white/60 text-xs mb-1">プレビュー</p>
              <p className="text-white text-xs leading-relaxed">
                {state.selectedScript.text}
              </p>
              {state.selectedScript.emotion && (
                <p className="text-white/50 text-xs mt-1">
                  感情: {state.selectedScript.emotion}
                </p>
              )}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={!state.selectedScript || isSending}
            className="mt-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                送信中...
              </>
            ) : (
              '送信'
            )}
          </button>
        </>
      )}
    </div>
  );
}
