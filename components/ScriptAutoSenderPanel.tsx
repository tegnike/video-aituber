'use client';

import { useRef, useCallback, ChangeEvent, useState, useEffect } from 'react';
import { Script, PresetSequenceInfo, ScriptSequence } from '@/lib/scriptTypes';
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

  // プリセット関連の状態
  const [presets, setPresets] = useState<PresetSequenceInfo[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetLoadingId, setPresetLoadingId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const {
    status,
    sequence,
    currentIndex,
    interval,
    error,
    loadSequence,
    loadSequenceFromData,
    start,
    pause,
    resume,
    stop,
    setInterval: setIntervalValue,
    clearSequence,
  } = useScriptAutoSender(onScriptSend, isSending);

  // プリセット一覧を取得する関数
  const fetchPresets = useCallback(async () => {
    setIsLoadingPresets(true);
    setPresetError(null);
    try {
      const response = await fetch('/api/preset-sequences');
      if (!response.ok) {
        throw new Error('プリセットの取得に失敗しました');
      }
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : 'プリセットの取得に失敗しました');
      setPresets([]);
    } finally {
      setIsLoadingPresets(false);
    }
  }, []);

  // コンポーネントマウント時にプリセット一覧を取得
  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // プリセット選択ハンドラ
  const handlePresetSelect = useCallback(async (preset: PresetSequenceInfo) => {
    // ファイル選択状態をクリア
    clearSequence();
    setSelectedPresetId(preset.id);
    setPresetLoadingId(preset.id);
    setPresetError(null);

    try {
      const response = await fetch(`/api/preset-sequences?id=${preset.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プリセットの読み込みに失敗しました');
      }
      const sequenceData: ScriptSequence = await response.json();
      loadSequenceFromData(sequenceData);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : 'プリセットの読み込みに失敗しました');
      setSelectedPresetId(null);
    } finally {
      setPresetLoadingId(null);
    }
  }, [clearSequence, loadSequenceFromData]);

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // プリセット選択状態をクリア
        setSelectedPresetId(null);
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

      {/* プリセット一覧セクション */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-xs">プリセット</span>
          <button
            onClick={fetchPresets}
            disabled={isLoadingPresets}
            className="px-2 py-1 text-xs text-white/60 hover:text-white bg-transparent hover:bg-white/10 disabled:cursor-not-allowed rounded transition-colors"
          >
            更新
          </button>
        </div>

        {/* ローディング状態 */}
        {isLoadingPresets && (
          <p className="text-white/50 text-xs">読み込み中...</p>
        )}

        {/* プリセットエラー表示 */}
        {presetError && !isLoadingPresets && (
          <p className="text-red-400 text-xs">{presetError}</p>
        )}

        {/* プリセット一覧 */}
        {!isLoadingPresets && !presetError && presets.length === 0 && (
          <p className="text-white/50 text-xs">プリセットがありません</p>
        )}

        {!isLoadingPresets && presets.length > 0 && (
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {presets.map((preset) => (
              <button
                key={preset.id}
                data-preset-id={preset.id}
                data-selected={selectedPresetId === preset.id}
                onClick={() => handlePresetSelect(preset)}
                disabled={status === 'running' || presetLoadingId !== null}
                className={`flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors ${
                  selectedPresetId === preset.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="truncate">{preset.name}</span>
                <span className="text-white/50 ml-2 shrink-0">
                  {presetLoadingId === preset.id ? (
                    <span data-testid={`preset-loading-${preset.id}`}>...</span>
                  ) : (
                    `${preset.scriptCount}件`
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
