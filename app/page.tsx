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

  // スタートボタン管理
  const [hasStarted, setHasStarted] = useState(false);

  // スタートアップフェーズ管理
  const [isStartupPhase, setIsStartupPhase] = useState(true);
  const [startupVideoPaths, setStartupVideoPaths] = useState<string[]>([]);
  const [currentStartupIndex, setCurrentStartupIndex] = useState(0);
  const [isLoadingStartup, setIsLoadingStartup] = useState(true);

  const fetchLoopVideoPath = useCallback(async () => {
    try {
      // 汎用動画生成APIにloopアクションをリクエスト
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{ action: 'loop', params: {} }],
        }),
      });
      const data = await response.json();

      // レスポンスからloop動画のURLを取得
      const loopResult = data.results?.find(
        (r: { action: string }) => r.action === 'loop'
      );
      const nextLoopPath =
        typeof loopResult?.videoUrl === 'string' && loopResult.videoUrl.length > 0
          ? loopResult.videoUrl
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
    }
  }, [usedVideoPaths, generatedVideoPath]);

  // スタートアップ動画の取得
  const fetchStartupVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/startup-video');
      const data = await response.json();

      if (!data.enabled || data.videoPaths.length === 0) {
        // スタートアップ無効または動画なし
        setIsStartupPhase(false);
        setIsLoadingStartup(false);
        return;
      }

      setStartupVideoPaths(data.videoPaths);
      setIsLoadingStartup(false);
    } catch (error) {
      console.error('Error fetching startup videos:', error);
      // エラー時はスタートアップをスキップしてループへ
      setIsStartupPhase(false);
      setIsLoadingStartup(false);
    }
  }, []);

  // スタートボタンが押されたら動画を取得開始
  useEffect(() => {
    if (!hasStarted) return;

    const hasPlayed = sessionStorage.getItem('startup-played');
    if (hasPlayed) {
      // 既に再生済みの場合はスタートアップをスキップ
      setIsStartupPhase(false);
      setIsLoadingStartup(false);
      fetchLoopVideoPath();
      return;
    }

    // スタートアップ動画を取得
    fetchStartupVideos();
    // ループ動画も並行して取得（スタートアップ後に必要）
    fetchLoopVideoPath();
  }, [hasStarted, fetchLoopVideoPath, fetchStartupVideos]);

  // 動画生成状態をポーリングで確認（開始後のみ）
  useEffect(() => {
    if (!hasStarted) return;

    pollVideoStatus();
    const interval = setInterval(pollVideoStatus, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, pollVideoStatus]);

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

  // スタートアップ動画終了時のハンドラ
  const handleStartupVideoEnd = useCallback(() => {
    setCurrentStartupIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= startupVideoPaths.length) {
        // 全スタートアップ動画再生完了
        sessionStorage.setItem('startup-played', 'true');
        setIsStartupPhase(false);
      }
      return nextIndex;
    });
  }, [startupVideoPaths.length]);

  const handleVideoEnd = useCallback(
    (finishedVideoPath: string | null) => {
      // 終了した動画を使用済みに追加（スタートアップ動画も含む）
      if (finishedVideoPath) {
        setUsedVideoPaths((prev) => {
          const newSet = new Set(prev);
          newSet.add(finishedVideoPath);
          return newSet;
        });
      }

      // スタートアップフェーズの場合
      if (isStartupPhase && startupVideoPaths.length > 0) {
        handleStartupVideoEnd();
        return;
      }

      if (!finishedVideoPath) {
        return;
      }
      // 現在の生成動画が終了した動画と一致する場合はクリア
      setGeneratedVideoPath((current) =>
        current === finishedVideoPath ? null : current
      );

      // 動画終了時に次の動画を即座に取得
      pollVideoStatus();
    },
    [pollVideoStatus, isStartupPhase, startupVideoPaths.length, handleStartupVideoEnd]
  );

  // 動画パスの決定
  // スタートアップフェーズの場合はスタートアップ動画を使用
  // それ以外は生成動画があればそれを使用、なければループ動画
  const videoPathToUse = isStartupPhase && startupVideoPaths.length > 0
    ? startupVideoPaths[currentStartupIndex]
    : generatedVideoPath && !usedVideoPaths.has(generatedVideoPath)
      ? generatedVideoPath
      : null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* スタートボタン（未開始時） */}
      {!hasStarted ? (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <button
            onClick={() => setHasStarted(true)}
            className="px-12 py-6 text-3xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors shadow-lg hover:shadow-xl"
          >
            スタート
          </button>
        </div>
      ) : loopVideoPath && !isLoadingStartup && (!isStartupPhase || startupVideoPaths.length > 0) ? (
        /* 動画プレーヤー（背景全面） */
        <VideoPlayer
          loopVideoPath={loopVideoPath}
          generatedVideoPath={
            isStartupPhase && startupVideoPaths.length > 0
              ? startupVideoPaths[0]
              : videoPathToUse
          }
          initialQueue={
            isStartupPhase && startupVideoPaths.length > 1
              ? startupVideoPaths.slice(1)
              : undefined
          }
          onVideoEnd={handleVideoEnd}
          enableAudioOnInteraction={false}
        />
      ) : (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          {isLoadingLoop || isLoadingStartup ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">
                {isLoadingStartup ? '準備中...' : '読み込み中...'}
              </p>
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
