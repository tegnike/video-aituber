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
  const [usedVideoPath, setUsedVideoPath] = useState<string | null>(null);

  // ループ動画のパス（デフォルトは public/videos/loop-video.mp4）
  const loopVideoPath = '/videos/loop-video.mp4';

  // 動画生成状態をポーリングで確認
  useEffect(() => {
    const pollVideoStatus = async () => {
      try {
        const response = await fetch('/api/generate-video-callback');
        const data = await response.json();

        if (data.videoPath && data.videoPath !== usedVideoPath) {
          // 新しい動画が生成された場合
          setGeneratedVideoPath(data.videoPath);
        }
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    };

    // 5秒ごとにポーリング
    const interval = setInterval(pollVideoStatus, 5000);

    return () => clearInterval(interval);
  }, [usedVideoPath]);

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

  const handleVideoEnd = useCallback(() => {
    // 生成動画が終了したら、使用済みとしてマーク
    if (generatedVideoPath) {
      setUsedVideoPath(generatedVideoPath);
      setGeneratedVideoPath(null);
    }
  }, [generatedVideoPath]);

  // 動画パスの決定: 生成動画が準備できている場合はそれを使用、そうでなければループ動画
  // ただし、動画プレーヤーコンポーネント内で切り替えを処理するため、
  // ここでは生成動画のパスのみを渡す
  const videoPathToUse =
    generatedVideoPath && generatedVideoPath !== usedVideoPath
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
