'use client';

import { useState, useEffect, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(
    null
  );
  const [usedVideoPaths, setUsedVideoPaths] = useState<Set<string>>(new Set());

  // ループ動画のパス（デフォルトは public/videos/loop-video.mp4）
  const loopVideoPath = '/videos/loop-video.mp4';

  // 動画生成状態をポーリングで確認する関数
  const pollVideoStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/generate-video-callback');
      const data = await response.json();

      if (
        data.videoPath &&
        !usedVideoPaths.has(data.videoPath) &&
        data.videoPath !== generatedVideoPath
      ) {
        // 新しい動画が生成された場合（使用済みでなく、現在設定されている動画でもない）
        setGeneratedVideoPath(data.videoPath);
      }
    } catch (error) {
      console.error('Error polling video status:', error);
    }
  }, [usedVideoPaths, generatedVideoPath]);

  // 動画生成状態をポーリングで確認
  useEffect(() => {
    // 1秒ごとにポーリング（間隔を短縮）
    const interval = setInterval(pollVideoStatus, 1000);

    return () => clearInterval(interval);
  }, [pollVideoStatus]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      // ユーザーメッセージを追加
      const userMessage: Message = {
        role: 'user',
        content: message,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // チャットAPIを呼び出し
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // アシスタントのメッセージを追加
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 動画生成は非同期で実行されるため、ここでは何もしない
        // ポーリングで動画生成の完了を確認
      } catch (error) {
        console.error('Error sending message:', error);
        // エラーメッセージを表示
        const errorMessage: Message = {
          role: 'assistant',
          content: 'エラーが発生しました。もう一度お試しください。',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const handleVideoEnd = useCallback(
    (finishedVideoPath: string | null) => {
      if (!finishedVideoPath) {
        return;
      }

      // 使用済み動画のセットに追加
      setUsedVideoPaths((prev) => {
        const newSet = new Set(prev);
        newSet.add(finishedVideoPath);
        return newSet;
      });
      // 現在の生成動画が終了した動画と一致する場合はクリア
      setGeneratedVideoPath((current) =>
        current === finishedVideoPath ? null : current
      );

      // 動画終了時に次の動画を即座に取得
      pollVideoStatus();
    },
    [pollVideoStatus]
  );

  // 動画パスの決定: 生成動画が準備できている場合はそれを使用、そうでなければループ動画
  // ただし、動画プレーヤーコンポーネント内で切り替えを処理するため、
  // ここでは生成動画のパスのみを渡す
  const videoPathToUse =
    generatedVideoPath && !usedVideoPaths.has(generatedVideoPath)
      ? generatedVideoPath
      : null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 動画プレーヤー（背景全面） */}
      <VideoPlayer
        loopVideoPath={loopVideoPath}
        generatedVideoPath={videoPathToUse}
        onVideoEnd={handleVideoEnd}
      />

      {/* チャット履歴 */}
      <ChatHistory messages={messages} isLoading={isLoading} />

      {/* チャット入力 */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
