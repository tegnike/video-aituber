'use client';

import { useState, useEffect, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';
import { useOneComme } from '@/hooks/useOneComme';

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

  // 設定
  const [appConfig, setAppConfig] = useState<{
    controlButtons: {
      start?: { actions: string[]; afterAction: string };
      end?: { actions: string[]; afterAction: string };
    };
    screenModes: {
      standby?: { backgroundAction: string };
      room?: { backgroundAction: string };
    };
  } | null>(null);

  // コントロール動画キュー（複数動画を順番に再生）
  const [controlVideoQueue, setControlVideoQueue] = useState<string[]>([]);
  const [prefetchedAfterActionPath, setPrefetchedAfterActionPath] = useState<string | null>(null);
  // 全コントロール動画パス（シーケンス完了検知用）
  const [allControlVideoPaths, setAllControlVideoPaths] = useState<string[]>([]);

  // わんコメ連携の状態
  const [oneCommeEnabled, setOneCommeEnabled] = useState(false);

  // 背景動画を取得（任意のアクション）
  const fetchBackgroundVideo = useCallback(async (action: string) => {
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

  // 設定を取得
  useEffect(() => {
    fetch('/api/settings/control-buttons')
      .then((res) => res.json())
      .then((data) => setAppConfig(data))
      .catch((err) => console.error('Failed to load config:', err));
  }, []);

  // コントロール動画（start または end）を取得（複数動画+afterAction動画を並列取得）
  const fetchControlVideo = useCallback(async (buttonType: 'start' | 'end') => {
    try {
      setIsLoadingControlVideo(true);
      setControlVideoType(buttonType);

      // 設定からアクション配列とafterActionを取得
      const buttonConfig = appConfig?.controlButtons?.[buttonType];
      const actions = buttonConfig?.actions || [buttonType];
      const afterAction = buttonConfig?.afterAction || 'loop';

      // 全てのアクション動画とafterAction動画を並列で取得
      const allActions = [...actions, afterAction];
      const responses = await Promise.all(
        allActions.map((action) =>
          fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ action, params: {} }] }),
          })
        )
      );

      const dataList = await Promise.all(responses.map((r) => r.json()));

      // 各アクションの動画パスを取得
      const videoPaths: string[] = [];
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const result = dataList[i].results?.find(
          (r: { action: string }) => r.action === action
        );
        const videoPath =
          typeof result?.videoUrl === 'string' && result.videoUrl.length > 0
            ? result.videoUrl
            : null;
        if (videoPath) {
          videoPaths.push(videoPath);
        }
      }

      // afterAction動画のパス
      const afterActionData = dataList[actions.length];
      const afterActionResult = afterActionData.results?.find(
        (r: { action: string }) => r.action === afterAction
      );
      const afterActionPath =
        typeof afterActionResult?.videoUrl === 'string' && afterActionResult.videoUrl.length > 0
          ? afterActionResult.videoUrl
          : null;

      // 最初の動画を再生、残りはキューに入れる
      if (videoPaths.length > 0) {
        setControlVideoPath(videoPaths[0]);
        setControlVideoQueue(videoPaths.slice(1));
        setAllControlVideoPaths(videoPaths);
      }

      if (afterActionPath) {
        setPrefetchedAfterActionPath(afterActionPath);
      }
    } catch (error) {
      console.error(`Error fetching ${buttonType} video:`, error);
      setControlVideoType(null);
    } finally {
      setIsLoadingControlVideo(false);
    }
  }, [appConfig]);

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
    // 設定から背景アクションを取得（デフォルト: standby=loop, room=dark）
    const defaultAction = mode === 'standby' ? 'loop' : 'dark';
    const action = appConfig?.screenModes?.[mode]?.backgroundAction || defaultAction;
    fetchBackgroundVideo(action);
  }, [fetchBackgroundVideo, appConfig]);

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

  // わんコメからコメントを受信した時の処理
  const handleOneCommeComment = useCallback(
    async (comment: { name: string; comment: string }) => {
      if (isLoading) return;

      // コメントをユーザーメッセージとして処理（名前付き）
      const formattedMessage = `[${comment.name}] ${comment.comment}`;

      const userMessage: Message = {
        role: 'user',
        content: formattedMessage,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: formattedMessage,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) throw new Error('Failed to send message');

        const data = await response.json();

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error processing OneComme comment:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: 'エラーが発生しました。',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  // わんコメ連携フック
  const { isConnected: oneCommeConnected, error: oneCommeError } = useOneComme({
    enabled: oneCommeEnabled && hasStarted,
    mode: 'diff',
    onComment: handleOneCommeComment,
  });

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

      // コントロール動画シーケンスの完了チェック
      // VideoPlayerが内部キューで管理するため、最後の動画が終了したら状態をクリア
      if (controlVideoType && finishedVideoPath) {
        const lastVideoPath = allControlVideoPaths[allControlVideoPaths.length - 1];
        if (finishedVideoPath === lastVideoPath) {
          // 全コントロール動画の再生完了
          setControlVideoPath(null);
          setControlVideoType(null);
          setControlVideoQueue([]);
          setAllControlVideoPaths([]);

          // プリフェッチ済みのafterAction動画を背景に設定
          if (prefetchedAfterActionPath) {
            setBackgroundVideoPath(prefetchedAfterActionPath);
            setPrefetchedAfterActionPath(null);
          }
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
    [pollVideoStatus, controlVideoType, allControlVideoPaths, prefetchedAfterActionPath]
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
            initialQueue={controlVideoQueue}
            afterQueueVideoPath={prefetchedAfterActionPath}
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

            {/* わんコメ連携トグル */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setOneCommeEnabled(!oneCommeEnabled)}
                className={`px-4 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg ${
                  oneCommeEnabled
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                わんコメ {oneCommeEnabled ? 'ON' : 'OFF'}
              </button>
              {oneCommeEnabled && (
                <div className="text-xs text-center">
                  {oneCommeConnected ? (
                    <span className="text-green-400">接続中</span>
                  ) : oneCommeError ? (
                    <span className="text-red-400">エラー</span>
                  ) : (
                    <span className="text-yellow-400">接続待ち...</span>
                  )}
                </div>
              )}
            </div>
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
