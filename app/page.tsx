'use client';

import { useState, useEffect, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 画面モード: standby=待機画面(loop), room=初期画面(room)
type ScreenMode = 'standby' | 'room';

// コントロール動画の種類
type ControlVideoType = 'start' | 'end' | null;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(
    null
  );
  const [usedVideoPaths, setUsedVideoPaths] = useState<Set<string>>(new Set());

  // 背景動画（loop or room）
  const [backgroundVideoPath, setBackgroundVideoPath] = useState<string | null>(null);
  const [isLoadingBackground, setIsLoadingBackground] = useState(true);
  const [backgroundVideoError, setBackgroundVideoError] = useState(false);

  // 画面モード選択
  const [hasStarted, setHasStarted] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode | null>(null);

  // コントロールボタンからの動画再生管理
  const [controlVideoPath, setControlVideoPath] = useState<string | null>(null);
  const [controlVideoType, setControlVideoType] = useState<ControlVideoType>(null);
  const [isLoadingControlVideo, setIsLoadingControlVideo] = useState(false);

  // コントロールボタン設定とプリフェッチ
  const [controlButtonsConfig, setControlButtonsConfig] = useState<{
    start?: { action: string; afterAction: string };
    end?: { action: string; afterAction: string };
  } | null>(null);
  const [prefetchedAfterActionPath, setPrefetchedAfterActionPath] = useState<string | null>(null);

  // 背景動画（loop または room）を取得
  const fetchBackgroundVideo = useCallback(async (action: 'loop' | 'room') => {
    try {
      setIsLoadingBackground(true);
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{ action, params: {} }],
        }),
      });
      const data = await response.json();

      const result = data.results?.find(
        (r: { action: string }) => r.action === action
      );
      const videoPath =
        typeof result?.videoUrl === 'string' && result.videoUrl.length > 0
          ? result.videoUrl
          : null;

      setBackgroundVideoPath((prev) => (prev === videoPath ? prev : videoPath));

      if (videoPath) {
        setBackgroundVideoError(false);
      } else {
        setBackgroundVideoError(true);
      }
    } catch (error) {
      console.error(`Error fetching ${action} video:`, error);
      setBackgroundVideoError(true);
    } finally {
      setIsLoadingBackground(false);
    }
  }, []);

  // コントロールボタン設定を取得
  useEffect(() => {
    fetch('/api/settings/control-buttons')
      .then((res) => res.json())
      .then((data) => setControlButtonsConfig(data))
      .catch((err) => console.error('Failed to load control buttons config:', err));
  }, []);

  // コントロール動画（start または end）を取得（afterAction動画も並列取得）
  const fetchControlVideo = useCallback(async (action: 'start' | 'end') => {
    try {
      setIsLoadingControlVideo(true);
      setControlVideoType(action);

      // afterActionを設定から取得（デフォルトはloop）
      const afterAction = controlButtonsConfig?.[action]?.afterAction || 'loop';

      // コントロール動画とafterAction動画を並列で取得
      const [controlResponse, afterActionResponse] = await Promise.all([
        fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ action, params: {} }] }),
        }),
        fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ action: afterAction, params: {} }] }),
        }),
      ]);

      const controlData = await controlResponse.json();
      const afterActionData = await afterActionResponse.json();

      // コントロール動画のパスを取得
      const controlResult = controlData.results?.find(
        (r: { action: string }) => r.action === action
      );
      const controlPath =
        typeof controlResult?.videoUrl === 'string' && controlResult.videoUrl.length > 0
          ? controlResult.videoUrl
          : null;

      if (controlPath) {
        setControlVideoPath(controlPath);
      }

      // afterAction動画のパスをプリフェッチとして保持
      const afterActionResult = afterActionData.results?.find(
        (r: { action: string }) => r.action === afterAction
      );
      const afterActionPath =
        typeof afterActionResult?.videoUrl === 'string' && afterActionResult.videoUrl.length > 0
          ? afterActionResult.videoUrl
          : null;

      if (afterActionPath) {
        setPrefetchedAfterActionPath(afterActionPath);
      }
    } catch (error) {
      console.error(`Error fetching ${action} video:`, error);
      setControlVideoType(null);
    } finally {
      setIsLoadingControlVideo(false);
    }
  }, [controlButtonsConfig]);

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

  // 画面モード選択時の処理
  const handleScreenModeSelect = useCallback((mode: ScreenMode) => {
    setScreenMode(mode);
    setHasStarted(true);
    // 選択に応じて背景動画を取得
    const action = mode === 'standby' ? 'loop' : 'room';
    fetchBackgroundVideo(action);
  }, [fetchBackgroundVideo]);

  // コントロールボタンのハンドラ
  const handleStartButton = useCallback(() => {
    if (isLoadingControlVideo || controlVideoType) return;
    fetchControlVideo('start');
  }, [fetchControlVideo, isLoadingControlVideo, controlVideoType]);

  const handleEndButton = useCallback(() => {
    if (isLoadingControlVideo || controlVideoType) return;
    fetchControlVideo('end');
  }, [fetchControlVideo, isLoadingControlVideo, controlVideoType]);

  // 動画生成状態をポーリングで確認（開始後のみ）
  useEffect(() => {
    if (!hasStarted) return;

    pollVideoStatus();
    const interval = setInterval(pollVideoStatus, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, pollVideoStatus]);

  // エラー時の自動リトライ（5秒ごと）
  useEffect(() => {
    if (!backgroundVideoError || backgroundVideoPath || !screenMode) return;

    const retryInterval = setInterval(() => {
      const action = screenMode === 'standby' ? 'loop' : 'room';
      fetchBackgroundVideo(action);
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [backgroundVideoError, backgroundVideoPath, screenMode, fetchBackgroundVideo]);

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
      // 終了した動画を使用済みに追加
      if (finishedVideoPath) {
        setUsedVideoPaths((prev) => {
          const newSet = new Set(prev);
          newSet.add(finishedVideoPath);
          return newSet;
        });
      }

      // コントロール動画が終了した場合
      if (controlVideoPath && finishedVideoPath === controlVideoPath) {
        setControlVideoPath(null);
        setControlVideoType(null);

        // プリフェッチ済みのafterAction動画を背景に設定
        if (prefetchedAfterActionPath) {
          setBackgroundVideoPath(prefetchedAfterActionPath);
          setPrefetchedAfterActionPath(null);
        }
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
    [pollVideoStatus, controlVideoPath, prefetchedAfterActionPath]
  );

  // 動画パスの決定
  // コントロール動画 > 生成動画 の優先順位
  const videoPathToUse = controlVideoPath
    ? controlVideoPath
    : generatedVideoPath && !usedVideoPaths.has(generatedVideoPath)
      ? generatedVideoPath
      : null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 初期選択画面（未開始時） */}
      {!hasStarted ? (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-white text-2xl font-bold text-center mb-4">
              画面モードを選択
            </h1>
            <button
              onClick={() => handleScreenModeSelect('standby')}
              className="px-12 py-6 text-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors shadow-lg hover:shadow-xl"
            >
              待機画面
            </button>
            <button
              onClick={() => handleScreenModeSelect('room')}
              className="px-12 py-6 text-2xl font-bold text-white bg-green-600 hover:bg-green-700 rounded-2xl transition-colors shadow-lg hover:shadow-xl"
            >
              初期画面
            </button>
          </div>
        </div>
      ) : backgroundVideoPath && !isLoadingBackground ? (
        <>
          {/* 動画プレーヤー（背景全面） */}
          <VideoPlayer
            loopVideoPath={backgroundVideoPath}
            generatedVideoPath={videoPathToUse}
            onVideoEnd={handleVideoEnd}
            enableAudioOnInteraction={false}
          />

          {/* 左側コントロールボタン */}
          <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
            <button
              onClick={handleStartButton}
              disabled={isLoadingControlVideo || !!controlVideoType}
              className="px-6 py-4 text-lg font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg"
            >
              {isLoadingControlVideo && controlVideoType === 'start' ? '読込中...' : '開始'}
            </button>
            <button
              onClick={handleEndButton}
              disabled={isLoadingControlVideo || !!controlVideoType}
              className="px-6 py-4 text-lg font-bold text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg"
            >
              {isLoadingControlVideo && controlVideoType === 'end' ? '読込中...' : '終了'}
            </button>
          </div>
        </>
      ) : (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          {isLoadingBackground ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">読み込み中...</p>
            </div>
          ) : backgroundVideoError ? (
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
