'use client';

import { useRef, useCallback, ChangeEvent } from 'react';
import { Script } from '@/lib/scriptTypes';
import { useScriptAutoSender } from '@/hooks/useScriptAutoSender';

interface ScriptAutoSenderPanelProps {
  /** 台本送信時のコールバック */
  onScriptSend: (script: Script) => Promise<void>;
  /** 送信中かどうか（外部から制御） */
  isSending?: boolean;
}

export default function ScriptAutoSenderPanel({
  onScriptSend,
  isSending = false,
}: ScriptAutoSenderPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    status,
    sequence,
    currentIndex,
    interval,
    error,
    loadSequence,
    start,
    pause,
    resume,
    stop,
    setInterval: setIntervalValue,
    clearSequence,
  } = useScriptAutoSender(onScriptSend, isSending);

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await loadSequence(file);
      }
      // input値をリセットして同じファイルを再選択可能にする
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [loadSequence]
  );

  // ファイル選択ボタンのクリック
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 間隔変更ハンドラ
  const handleIntervalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        setIntervalValue(value);
      }
    },
    [setIntervalValue]
  );

  // 現在送信中の台本を取得
  const currentScript =
    sequence && status === 'running' && currentIndex < sequence.scripts.length
      ? sequence.scripts[currentIndex]
      : null;

  // 進捗表示用
  const total = sequence?.scripts.length ?? 0;
  const displayIndex = status === 'completed' ? total : currentIndex + 1;

  return (
    <div className="flex flex-col gap-3 p-3 bg-black/60 rounded-xl backdrop-blur-sm ">
      <h2 className="text-white text-sm font-bold">自動送信</h2>

      {/* ファイル選択 */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleFileSelect}
          disabled={status === 'running'}
          className="px-3 py-2 text-sm text-white bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
        >
          シーケンスファイルを選択
        </button>
        {sequence && (
          <button
            onClick={clearSequence}
            disabled={status === 'running'}
            className="px-2 py-1 text-xs text-white/70 hover:text-white bg-transparent hover:bg-white/10 disabled:cursor-not-allowed rounded transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* シーケンス情報とプレビュー */}
      {sequence && (
        <div className="flex flex-col gap-2">
          {/* シーケンス名と件数 */}
          <div className="text-white/80 text-xs">
            {sequence.name && (
              <span className="font-bold">{sequence.name} - </span>
            )}
            <span>{total}件の台本</span>
          </div>

          {/* 進捗表示 */}
          {(status === 'running' || status === 'paused' || status === 'completed') && (
            <div className="flex items-center gap-2">
              <div className="text-white text-sm font-bold">
                {displayIndex}/{total}
              </div>
              {status === 'completed' && (
                <span className="text-green-400 text-xs">完了しました</span>
              )}
              {status === 'paused' && (
                <span className="text-yellow-400 text-xs">一時停止中</span>
              )}
              {status === 'running' && (
                <span className="text-blue-400 text-xs">送信中...</span>
              )}
            </div>
          )}

          {/* 現在送信中の台本プレビュー */}
          {currentScript && (
            <div className="p-2 bg-white/10 rounded">
              <p className="text-white/60 text-xs mb-1">送信中</p>
              <p className="text-white text-xs font-bold">{currentScript.label}</p>
              <p className="text-white/80 text-xs leading-relaxed mt-1 line-clamp-2">
                {currentScript.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 送信間隔設定 */}
      {sequence && (
        <div className="flex items-center gap-2">
          <label className="text-white/60 text-xs">間隔:</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={interval}
            onChange={handleIntervalChange}
            className="w-16 px-2 py-1 text-xs text-white bg-white/10 border border-white/20 rounded focus:outline-none focus:border-blue-400"
          />
          <span className="text-white/60 text-xs">秒</span>
        </div>
      )}

      {/* 制御ボタン */}
      {sequence && (
        <div className="flex flex-wrap gap-2">
          {/* 開始ボタン: idle時のみ */}
          {(status === 'idle' || status === 'completed') && (
            <button
              onClick={start}
              disabled={isSending}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              開始
            </button>
          )}

          {/* 一時停止ボタン: running時のみ */}
          {status === 'running' && (
            <button
              onClick={pause}
              disabled={isSending}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              一時停止
            </button>
          )}

          {/* 再開ボタン: paused時のみ */}
          {status === 'paused' && (
            <button
              onClick={resume}
              disabled={isSending}
              className="flex-1 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              再開
            </button>
          )}

          {/* 停止ボタン: running or paused時 */}
          {(status === 'running' || status === 'paused') && (
            <button
              onClick={stop}
              disabled={isSending}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              停止
            </button>
          )}
        </div>
      )}
    </div>
  );
}
