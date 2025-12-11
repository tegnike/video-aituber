'use client';

import { useState, useEffect, useCallback } from 'react';

interface MessageFormPanelProps {
  /** メッセージ送信時のコールバック */
  onMessageSend: (message: string, username: string) => Promise<void>;
  /** 送信中かどうか（外部から制御） */
  isSending?: boolean;
}

const LOCAL_STORAGE_KEY = 'remote-message-username';
const DEFAULT_USERNAME = '配信者';

export default function MessageFormPanel({
  onMessageSend,
  isSending = false,
}: MessageFormPanelProps) {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [error, setError] = useState<string | null>(null);

  // localStorageからユーザー名を読み込み
  useEffect(() => {
    const savedUsername = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // ユーザー名変更時にlocalStorageへ保存
  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    localStorage.setItem(LOCAL_STORAGE_KEY, value);
  }, []);

  // 送信処理
  const handleSubmit = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setError(null);

    try {
      // ユーザー名が空の場合はデフォルト値を使用
      const effectiveUsername = username.trim() || DEFAULT_USERNAME;
      await onMessageSend(message.trim(), effectiveUsername);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    }
  }, [message, username, isSending, onMessageSend]);

  // Enterキーでの送信（日本語入力確定中は除外）
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // e.nativeEvent.isComposingとe.isComposingの両方をチェック（ブラウザ互換性のため）
    const isComposing = e.nativeEvent?.isComposing || (e as unknown as KeyboardEvent).isComposing;
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const isSubmitDisabled = !message.trim() || isSending;

  return (
    <div className="flex flex-col gap-3 p-3 bg-black/60 rounded-xl backdrop-blur-sm ">
      <h2 className="text-white text-sm font-bold">メッセージ送信</h2>

      {/* ユーザー名入力 */}
      <div>
        <input
          type="text"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="ユーザー名"
          className="w-full px-3 py-2 text-sm bg-white/10 text-white placeholder-white/50 rounded border border-white/20 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* メッセージ入力 */}
      <div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="w-full px-3 py-2 text-sm bg-white/10 text-white placeholder-white/50 rounded border border-white/20 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* エラー表示 */}
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {/* 送信ボタン */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
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
    </div>
  );
}
