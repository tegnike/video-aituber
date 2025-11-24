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
  const [loopVideoPath, setLoopVideoPath] = useState<string | null>(null);
  const [isLoadingLoop, setIsLoadingLoop] = useState(true);
  const [loopVideoError, setLoopVideoError] = useState(false);

  const fetchLoopVideoPath = useCallback(async () => {
    try {
      const response = await fetch('/api/loop-video');
      const data = await response.json();

      const nextLoopPath =
        typeof data.loopVideoPath === 'string' && data.loopVideoPath.length > 0
          ? data.loopVideoPath
          : null;

      setLoopVideoPath((prev) => (prev === nextLoopPath ? prev : nextLoopPath));

      if (nextLoopPath) {
        setLoopVideoError(false);
      } else {
        setLoopVideoError(true);
      }
    } catch (error) {
      console.error('Error fetching loop video path:', error);
      setLoopVideoError(true);
    } finally {
      setIsLoadingLoop(false);
    }
  }, []);

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
    } finally {
      await fetchLoopVideoPath();
    }
  }, [usedVideoPaths, generatedVideoPath, fetchLoopVideoPath]);

  // 動画生成状態をポーリングで確認
  useEffect(() => {
    // 初回すぐにポーリングし、その後は1秒ごとに実行
    fetchLoopVideoPath();
    pollVideoStatus();
    // 1秒ごとにポーリング（間隔を短縮）
    const interval = setInterval(pollVideoStatus, 1000);

    return () => clearInterval(interval);
  }, [pollVideoStatus, fetchLoopVideoPath]);

  // エラー時の自動リトライ（5秒ごと）
  useEffect(() => {
    if (!loopVideoError || loopVideoPath) return;

    const retryInterval = setInterval(() => {
      setIsLoadingLoop(true);
      fetchLoopVideoPath();
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [loopVideoError, loopVideoPath, fetchLoopVideoPath]);

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
      {loopVideoPath ? (
        <VideoPlayer
          loopVideoPath={loopVideoPath}
          generatedVideoPath={videoPathToUse}
          onVideoEnd={handleVideoEnd}
        />
      ) : (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          {isLoadingLoop ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">読み込み中...</p>
            </div>
          ) : loopVideoError ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-white/70 text-sm">動画サーバーに接続できません</p>
              <p className="text-white/50 text-xs">再接続中...</p>
            </div>
          ) : null}
        </div>
      )}

      {/* チャット履歴 */}
      <ChatHistory messages={messages} isLoading={isLoading} />

      {/* チャット入力 */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
