'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';
import ScriptPanel from '@/components/ScriptPanel';
import { useOneComme } from '@/hooks/useOneComme';
import { useMainScreenSync } from '@/hooks/useMainScreenSync';
import { Script } from '@/lib/scriptTypes';
import type { AppState, QueuedComment } from '@/lib/remoteState';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  name?: string;
  profileImage?: string;
}

// セッションID生成
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

  // セッションID（ページロード時に一度だけ生成）
  const sessionId = useMemo(() => generateSessionId(), []);

  // 背景動画（loop動画の配列 or room）
  const [backgroundVideoPaths, setBackgroundVideoPaths] = useState<string[]>([]);
  const [isLoadingBackground, setIsLoadingBackground] = useState(true);
  const [backgroundVideoError, setBackgroundVideoError] = useState(false);

  // 画面モード（初回から待機画面を表示）
  // @requirements 2.1, 2.2 - hasStartedは常にtrue、screenModeはstandbyで初期化
  const [hasStarted] = useState(true);
  const [screenMode, setScreenMode] = useState<ScreenMode>('standby');

  // コントロールボタンからの動画再生管理
  const [controlVideoPath, setControlVideoPath] = useState<string | null>(null);
  const [controlVideoType, setControlVideoType] = useState<ControlVideoType>(null);
  const [isLoadingControlVideo, setIsLoadingControlVideo] = useState(false);

  // 設定
  const [appConfig, setAppConfig] = useState<{
    controlButtons: {
      start?: { actions: string[]; afterAction: string | string[] };
      end?: { actions: string[]; afterAction: string | string[] };
    };
    screenModes: {
      standby?: { backgroundAction: string };
      room?: { backgroundAction: string };
    };
    loopActions: string[];
  } | null>(null);

  // コントロール動画キュー（複数動画を順番に再生）
  const [controlVideoQueue, setControlVideoQueue] = useState<string[]>([]);
  const [prefetchedAfterActionPaths, setPrefetchedAfterActionPaths] = useState<string[]>([]);
  // 全コントロール動画パス（シーケンス完了検知用）
  const [allControlVideoPaths, setAllControlVideoPaths] = useState<string[]>([]);

  // わんコメ連携の状態
  const [oneCommeEnabled, setOneCommeEnabled] = useState(false);

  // 台本送信中フラグ
  const [isScriptSending, setIsScriptSending] = useState(false);

  // UI表示オプション（リモートからの制御用）
  // @requirements 5.1, 5.2, 5.3 - リモートパネルからのUI表示切替
  // デフォルトで非表示（右下のアイコンで切り替え可能）
  const [uiVisibility, setUIVisibility] = useState({
    controls: false,
    chatHistory: true,
    chatInput: false,
  });

  // コメントキュー（わんコメから受信したコメントを蓄積、LLMへの送信は手動）
  // @see .kiro/specs/comment-queue-control/design.md
  const [commentQueue, setCommentQueue] = useState<QueuedComment[]>([]);


  // 背景動画を取得（複数アクションを並列取得）
  const fetchBackgroundVideos = useCallback(async (actions: string[]) => {
    try {
      setIsLoadingBackground(true);
      // 複数アクションを並列で取得
      const responses = await Promise.all(
        actions.map((action) =>
          fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ action, params: {} }] }),
          })
        )
      );

      const dataList = await Promise.all(responses.map((r) => r.json()));

      // 各アクションの動画パスを収集
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

      setBackgroundVideoPaths(videoPaths);

      if (videoPaths.length > 0) {
        setBackgroundVideoError(false);
      } else {
        setBackgroundVideoError(true);
      }
    } catch (error) {
      console.error(`Error fetching background videos:`, error);
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

  // 設定読み込み後に背景動画を自動取得（初期化時のみ）
  // @requirements 1.2 - アプリ起動時に背景動画の読み込みを開始
  const initialBackgroundFetchedRef = useRef(false);
  useEffect(() => {
    if (!appConfig || initialBackgroundFetchedRef.current) return;
    initialBackgroundFetchedRef.current = true;

    // standbyモードの場合はloopActionsから動画を取得
    const loopActions = appConfig.loopActions ?? ['loop'];
    fetchBackgroundVideos(loopActions);
  }, [appConfig, fetchBackgroundVideos]);

  // コントロール動画セッション管理
  // @requirements 1.3, 2.4 - コントロール動画用のセッションIDを管理
  const [controlVideoSessionId, setControlVideoSessionId] = useState<string | null>(null);
  const [expectedSequenceCount, setExpectedSequenceCount] = useState(0);

  // コントロール動画（start または end）を取得（複数動画+afterAction動画を並列取得）
  // @requirements 1.3, 1.4, 2.4 - セッションID生成とシーケンス番号付与
  // 動画パスはポーリング経由で順序通りに取得される
  const fetchControlVideo = useCallback(async (buttonType: 'start' | 'end') => {
    try {
      setIsLoadingControlVideo(true);
      setControlVideoType(buttonType);

      // 設定からアクション配列とafterActionを取得
      const buttonConfig = appConfig?.controlButtons?.[buttonType];
      const actions = buttonConfig?.actions || [buttonType];
      const afterActionConfig = buttonConfig?.afterAction || 'loop';
      const afterActions = Array.isArray(afterActionConfig) ? afterActionConfig : [afterActionConfig];

      // セッションIDを生成（コントロール動画用）
      // @requirements 1.3 - 各リクエストに順序識別子を付与
      const newSessionId = crypto.randomUUID();
      setControlVideoSessionId(newSessionId);

      // アクション数のみカウント（afterActionsはループ動画として扱われるためカウント対象外）
      const totalCount = actions.length + afterActions.length;
      setExpectedSequenceCount(actions.length);

      // 状態をクリア（ポーリングで再取得するため）
      setControlVideoPath(null);
      setControlVideoQueue([]);
      setAllControlVideoPaths([]);
      setPrefetchedAfterActionPaths([]);

      // 全てのアクション動画とafterAction動画を並列でリクエスト送信
      // @requirements 1.4 - afterActionsの動画をactionsの動画の後に再生
      // 動画パスはコールバックAPI経由でポーリング取得し、順序保証
      const allActions = [...actions, ...afterActions];
      await Promise.all(
        allActions.map((action, index) =>
          fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{ action, params: {} }],
              sessionId: newSessionId,
              sequence: index,
              totalCount,
            }),
          })
        )
      );

      // 動画パスはポーリング経由で取得されるため、ここでは設定しない
      // @requirements 2.1, 2.2, 3.1 - コールバックAPIでシーケンス順に格納・取得
    } catch (error) {
      console.error(`Error fetching ${buttonType} video:`, error);
      setControlVideoType(null);
      setControlVideoSessionId(null);
    } finally {
      setIsLoadingControlVideo(false);
    }
  }, [appConfig]);

  // 動画生成状態をポーリングで確認する関数（チャット応答動画用）
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

  // コントロール動画用ポーリング（セッションIDを使用）
  // @requirements 3.1, 3.2 - セッションIDでポーリングし、順序通りに動画を取得
  const pollControlVideoStatus = useCallback(async () => {
    if (!controlVideoSessionId) return;

    try {
      const response = await fetch(
        `/api/generate-video-callback?sessionId=${encodeURIComponent(controlVideoSessionId)}`
      );
      const data = await response.json();

      if (data.videoPath && !usedVideoPaths.has(data.videoPath)) {
        // 順序通りに動画が取得できた
        if (!controlVideoPath) {
          // まだコントロール動画が設定されていない場合は設定
          setControlVideoPath(data.videoPath);
        } else {
          // 既にコントロール動画がある場合はキューに追加
          setControlVideoQueue((prev) => {
            if (!prev.includes(data.videoPath)) {
              return [...prev, data.videoPath];
            }
            return prev;
          });
        }

        // 全動画パスリストに追加
        setAllControlVideoPaths((prev) => {
          if (!prev.includes(data.videoPath)) {
            return [...prev, data.videoPath];
          }
          return prev;
        });

        // セッション完了チェック
        if (data.isComplete) {
          // 完了したのでセッションIDをクリア
          setControlVideoSessionId(null);
        }
      }
    } catch (error) {
      console.error('Error polling control video status:', error);
    }
  }, [controlVideoSessionId, usedVideoPaths, controlVideoPath]);

  // 画面モード選択時の処理（リモートからのselectModeコマンド用）
  // @requirements 3.2, 4.3 - setHasStartedを削除（常にtrue）、リモートからのモード切り替えを維持
  const handleScreenModeSelect = useCallback((mode: ScreenMode) => {
    setScreenMode(mode);

    if (mode === 'standby') {
      // standbyモード: loopActionsから複数動画を取得
      const loopActions = appConfig?.loopActions ?? ['loop'];
      fetchBackgroundVideos(loopActions);
    } else {
      // roomモード: 単一の背景アクションを取得
      const action = appConfig?.screenModes?.[mode]?.backgroundAction || 'dark';
      fetchBackgroundVideos([action]);
    }
  }, [fetchBackgroundVideos, appConfig]);

  // コントロールボタンのハンドラ
  const handleStartButton = useCallback(() => {
    if (isLoadingControlVideo || controlVideoType) return;
    fetchControlVideo('start');
  }, [fetchControlVideo, isLoadingControlVideo, controlVideoType]);

  const handleEndButton = useCallback(() => {
    if (isLoadingControlVideo || controlVideoType) return;
    fetchControlVideo('end');
  }, [fetchControlVideo, isLoadingControlVideo, controlVideoType]);

  // 台本送信ハンドラ
  // @requirements 2.3 - 台本送信時に動画生成を開始し、VideoPlayerと連携
  const handleScriptSend = useCallback(async (script: Script) => {
    if (isScriptSending) return;

    setIsScriptSending(true);
    try {
      const response = await fetch('/api/script-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '台本の送信に失敗しました');
      }

      // 動画生成は非同期で実行されるため、ポーリングで結果を取得
      // 既存のポーリング機構（pollVideoStatus）が動画を検出する
    } catch (error) {
      console.error('[handleScriptSend] エラー:', error);
      throw error; // ScriptPanelでエラー表示するため再throw
    } finally {
      setIsScriptSending(false);
    }
  }, [isScriptSending]);

  // リモートからのメッセージ送信ハンドラ
  // @requirements 4.1 - リモートからsendMessageコマンドを受信してチャットフローに渡す
  const handleRemoteSendMessage = useCallback(
    async (message: string, username: string) => {
      if (!message.trim() || isLoading) return;

      // ユーザーメッセージを追加（指定されたユーザー名を使用）
      const userMessage: Message = {
        role: 'user',
        content: message,
        name: username || '配信者',
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // チャットAPIを呼び出し（ワークフロー用にsessionId, username, commentを送信）
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            username: username || '配信者',
            comment: message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // shouldRespond: false の場合は応答なし
        if (data.shouldRespond === false) {
          return;
        }

        // アシスタントのメッセージを追加
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 動画生成は非同期で実行されるため、ここでは何もしない
        // ポーリングで動画生成の完了を確認
      } catch (error) {
        console.error('Error sending remote message:', error);
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
    [sessionId, isLoading]
  );

  // リモートからの台本送信ハンドラ（scriptオブジェクト全体を受け取る）
  const handleRemoteSendScript = useCallback(async (script: Script) => {
    if (isScriptSending) return;

    setIsScriptSending(true);
    try {
      const response = await fetch('/api/script-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '台本の送信に失敗しました');
      }
    } catch (error) {
      console.error('[handleRemoteSendScript] エラー:', error);
    } finally {
      setIsScriptSending(false);
    }
  }, [isScriptSending]);

  // 動画生成状態をポーリングで確認（開始後のみ、チャット応答動画用）
  useEffect(() => {
    if (!hasStarted) return;

    pollVideoStatus();
    const interval = setInterval(pollVideoStatus, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, pollVideoStatus]);

  // コントロール動画用ポーリング（セッションIDがある場合のみ）
  // @requirements 3.1, 3.2 - セッションIDでポーリングし、順序通りに動画を取得
  useEffect(() => {
    if (!controlVideoSessionId) return;

    pollControlVideoStatus();
    const interval = setInterval(pollControlVideoStatus, 500); // 高頻度でポーリング
    return () => clearInterval(interval);
  }, [controlVideoSessionId, pollControlVideoStatus]);

  // エラー時の自動リトライ（5秒ごと）
  useEffect(() => {
    if (!backgroundVideoError || backgroundVideoPaths.length > 0 || !screenMode) return;

    const retryInterval = setInterval(() => {
      if (screenMode === 'standby') {
        const loopActions = appConfig?.loopActions ?? ['loop'];
        fetchBackgroundVideos(loopActions);
      } else {
        const action = appConfig?.screenModes?.[screenMode]?.backgroundAction || 'dark';
        fetchBackgroundVideos([action]);
      }
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [backgroundVideoError, backgroundVideoPaths.length, screenMode, fetchBackgroundVideos, appConfig]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      // ユーザーメッセージを追加
      const userMessage: Message = {
        role: 'user',
        content: message,
        name: 'マスター',
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // チャットAPIを呼び出し（ワークフロー用にsessionId, username, commentを送信）
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            username: 'マスター',
            comment: message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // shouldRespond: false の場合は応答なし
        if (data.shouldRespond === false) {
          return;
        }

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
    [sessionId, isLoading]
  );

  // わんコメからコメントを受信した時の処理
  // @see .kiro/specs/comment-queue-control/design.md
  // @requirements 1.1, 1.4, 2.1, 2.2, 2.3 - LLMへの自動送信を停止し、キューに追加のみ行う
  const handleOneCommeComment = useCallback(
    (comment: { id?: string; name: string; comment: string; profileImage?: string }) => {
      const messageContent = comment.comment.trim();
      if (!messageContent) return;

      // コメントをユーザーメッセージとして表示（メイン画面のチャット履歴）
      // @requirements 2.2 - メイン画面のライブチャットに通常通り表示
      const userMessage: Message = {
        role: 'user',
        content: messageContent,
        name: comment.name,
        profileImage: comment.profileImage,
      };
      setMessages((prev) => [...prev, userMessage]);

      // コメントをキューに追加（新しいものを先頭に）
      // @requirements 1.1, 1.4, 2.3 - キューに追加、新しいコメントを上部に
      const queuedComment: QueuedComment = {
        id: comment.id || `onecomme-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: comment.name,
        comment: messageContent,
        profileImage: comment.profileImage,
        receivedAt: Date.now(),
        isSent: false,
      };
      setCommentQueue((prev) => [queuedComment, ...prev]);

      // LLMへの自動送信は行わない
      // @requirements 2.1 - LLMサーバーへの自動送信を行わない
    },
    []
  );

  // わんコメ連携フック
  const { isConnected: oneCommeConnected, error: oneCommeError } = useOneComme({
    enabled: oneCommeEnabled && hasStarted,
    mode: 'diff',
    onComment: handleOneCommeComment,
  });

  // リモートからのコマンドハンドラ
  // @requirements 2.1, 2.2, 3.2 - リモートパネルからの操作を受信して実行
  const handleRemoteSelectMode = useCallback((mode: 'standby' | 'room') => {
    handleScreenModeSelect(mode);
  }, [handleScreenModeSelect]);

  const handleRemoteControlVideo = useCallback((action: 'start' | 'end') => {
    if (action === 'start') {
      handleStartButton();
    } else {
      handleEndButton();
    }
  }, [handleStartButton, handleEndButton]);

  const handleRemoteToggleOneComme = useCallback((enabled: boolean) => {
    setOneCommeEnabled(enabled);
  }, []);

  // @requirements 5.1, 5.2, 5.3 - リモートパネルからのUI表示切替を受信
  const handleRemoteUIVisibilityChange = useCallback((
    target: 'controls' | 'chatHistory' | 'chatInput',
    visible: boolean
  ) => {
    setUIVisibility(prev => ({ ...prev, [target]: visible }));
  }, []);

  // キューからコメントをLLMに送信
  // @see .kiro/specs/comment-queue-control/design.md
  // @requirements 3.1, 3.3, 4.1 - 指定されたコメントをLLMサーバーに送信
  const handleSendQueuedComment = useCallback(
    async (commentId: string) => {
      // キューから該当コメントを探す
      const targetComment = commentQueue.find((c) => c.id === commentId);
      if (!targetComment) {
        console.warn(`[handleSendQueuedComment] コメントが見つかりません: ${commentId}`);
        return;
      }

      // 既に送信済みの場合は無視
      if (targetComment.isSent) {
        console.warn(`[handleSendQueuedComment] 既に送信済み: ${commentId}`);
        return;
      }

      // ローディング中の場合は処理しない
      if (isLoading) {
        console.warn(`[handleSendQueuedComment] ローディング中のためスキップ: ${commentId}`);
        return;
      }

      setIsLoading(true);

      try {
        // LLMサーバーにコメントを送信
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            username: targetComment.name,
            comment: targetComment.comment,
          }),
        });

        if (!response.ok) throw new Error('Failed to send message');

        const data = await response.json();

        // 送信済みとしてマーク
        // @requirements 4.1 - 送信完了後にキュー内のコメントを送信済みに更新
        setCommentQueue((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, isSent: true } : c))
        );

        // shouldRespond: false の場合は応答なし
        if (data.shouldRespond === false) {
          return;
        }

        // アシスタントのメッセージを追加
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('[handleSendQueuedComment] エラー:', error);
        // エラー時は送信済みにしない
        const errorMessage: Message = {
          role: 'assistant',
          content: 'エラーが発生しました。',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [commentQueue, sessionId, isLoading]
  );

  // メイン画面用SSE同期フック
  // @requirements 4.1 - リモートからのコマンドを受信して状態を更新
  const { isConnected: isRemoteConnected, reportState } = useMainScreenSync({
    onSelectMode: handleRemoteSelectMode,
    onControlVideo: handleRemoteControlVideo,
    onToggleOneComme: handleRemoteToggleOneComme,
    onUIVisibilityChange: handleRemoteUIVisibilityChange,
    onSendScript: handleRemoteSendScript,
    onSendMessage: handleRemoteSendMessage,
    onSendQueuedComment: handleSendQueuedComment,
  });

  // 状態変更時にリモートに報告
  // @requirements 2.5, 4.2, 4.3 - メイン画面の状態をリモートに報告
  // @see .kiro/specs/comment-queue-control/design.md - コメントキュー状態の同期
  const lastReportedStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isRemoteConnected) return;

    const currentState: AppState = {
      hasStarted,
      screenMode,
      isLoadingBackground,
      isLoadingControlVideo,
      controlVideoType,
      oneCommeEnabled,
      oneCommeConnected,
      isScriptSending,
      uiVisibility,
      commentQueue,
    };

    const stateString = JSON.stringify(currentState);
    if (stateString !== lastReportedStateRef.current) {
      lastReportedStateRef.current = stateString;
      reportState(currentState).catch(err => {
        console.error('Failed to report state:', err);
      });
    }
  }, [
    isRemoteConnected,
    hasStarted,
    screenMode,
    isLoadingBackground,
    isLoadingControlVideo,
    controlVideoType,
    oneCommeEnabled,
    oneCommeConnected,
    isScriptSending,
    uiVisibility,
    commentQueue,
    reportState,
  ]);

  // 再生済み動画カウント（コントロール動画完了検知用）
  const [playedControlVideoCount, setPlayedControlVideoCount] = useState(0);

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
      // @requirements 3.3 - セッション完了後に状態をクリア
      if (controlVideoType && finishedVideoPath) {
        const newPlayedCount = playedControlVideoCount + 1;
        setPlayedControlVideoCount(newPlayedCount);

        // 全コントロール動画の再生完了（期待するシーケンス数と一致）
        if (newPlayedCount >= expectedSequenceCount && expectedSequenceCount > 0) {
          // 全コントロール動画の再生完了
          setControlVideoPath(null);
          setControlVideoType(null);
          setControlVideoQueue([]);
          setAllControlVideoPaths([]);
          setControlVideoSessionId(null);
          setPlayedControlVideoCount(0);
          setExpectedSequenceCount(0);

          // プリフェッチ済みのafterAction動画を背景に設定
          if (prefetchedAfterActionPaths.length > 0) {
            setBackgroundVideoPaths(prefetchedAfterActionPaths);
            setPrefetchedAfterActionPaths([]);
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
    [pollVideoStatus, controlVideoType, prefetchedAfterActionPaths, playedControlVideoCount, expectedSequenceCount]
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
      {/* メイン画面 */}
      {backgroundVideoPaths.length > 0 && !isLoadingBackground ? (
        <>
          {/* 動画プレーヤー（背景全面） */}
          <VideoPlayer
            loopVideoPaths={backgroundVideoPaths}
            generatedVideoPath={videoPathToUse}
            initialQueue={controlVideoQueue}
            afterQueueVideoPaths={prefetchedAfterActionPaths}
            onVideoEnd={handleVideoEnd}
            enableAudioOnInteraction={false}
          />

          {/* 左側コントロールパネル */}
          {/* @requirements 5.1 - リモートパネルからの表示/非表示切替 */}
          {uiVisibility.controls && (
            <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
              {/* コントロールボタン */}
              <div className="flex flex-col gap-4">
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

              {/* 台本パネル */}
              <ScriptPanel
                onScriptSend={handleScriptSend}
                isSending={isScriptSending}
              />
            </div>
          )}
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
      {/* @requirements 5.2 - リモートパネルからの表示/非表示切替 */}
      {uiVisibility.chatHistory && (
        <ChatHistory messages={messages} />
      )}

      {/* チャット入力 */}
      {/* @requirements 5.3 - リモートパネルからの表示/非表示切替 */}
      {uiVisibility.chatInput && (
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      )}

      {/* 右下: UI表示切り替えアイコン */}
      {hasStarted && (
        <div className="fixed bottom-4 right-4 z-[60] flex gap-2">
          {/* チャット入力表示切り替え */}
          <button
            onClick={() => setUIVisibility(prev => ({ ...prev, chatInput: !prev.chatInput }))}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
            title={uiVisibility.chatInput ? '入力フォームを非表示' : '入力フォームを表示'}
          >
            {uiVisibility.chatInput ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
              </svg>
            )}
          </button>
          {/* コントロール表示切り替え */}
          <button
            onClick={() => setUIVisibility(prev => ({ ...prev, controls: !prev.controls }))}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
            title={uiVisibility.controls ? 'コントロールを非表示' : 'コントロールを表示'}
          >
            {uiVisibility.controls ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
