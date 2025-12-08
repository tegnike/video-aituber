'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// OneSDKの型定義
// @see https://onecomme.com/docs/developer/onesdk-js
interface OneCommeComment {
  /** コメントの一意識別子 */
  id: string;
  /** ユーザー名 */
  name: string;
  /** コメント本文 */
  comment: string;
  /** プロフィール画像URL */
  profileImage?: string;
  /** 配信サービス識別子 (youtube, twitch, nicolive, etc.) */
  service?: string;
  /** コメント投稿時刻（UNIXタイムスタンプ） */
  timestamp?: number;
  /** ユーザーID（YouTubeの場合はチャンネルID、Twitchの場合はユーザーIDなど） */
  userId?: string;
  /** 表示名（プラットフォームによって異なる名前表示用） */
  displayName?: string;
  /** スクリーンネーム（@で始まるID形式の名前、Twitterなど） */
  screenName?: string;
  /** わんコメで設定したニックネーム（ユーザーごとのカスタム名） */
  nickname?: string;
  /** バッジ情報（メンバーシップ、モデレーター、認証バッジなど） */
  badges?: Array<{ label?: string; url?: string }>;
  /** 配信者本人のコメントかどうか */
  isOwner?: boolean;
  /** サポーター判定（メンバーシップ、サブスクライバーなど） */
  isSupporter?: boolean;
  /** スーパーチャット・ギフト付きコメントかどうか */
  hasGift?: boolean;
  /** 配信ID（同一配信のコメントを識別するため） */
  liveId?: string;
}

interface OneSDKConfig {
  mode?: 'all' | 'diff';
  permissions?: string[];
  intervalTime?: number;
  commentLimit?: number;
}

interface UseOneCommeOptions {
  enabled?: boolean;
  mode?: 'all' | 'diff';
  onComment?: (comment: OneCommeComment) => void;
  oneCommePort?: number;
}

interface UseOneCommeReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  comments: OneCommeComment[];
}

declare global {
  interface Window {
    OneSDK?: {
      setup: (config: OneSDKConfig) => void;
      ready: () => Promise<void>;
      connect: () => Promise<void>;
      subscribe: (options: {
        action: string;
        callback: (data: unknown) => void;
      }) => void;
    };
  }
}

export function useOneComme(options: UseOneCommeOptions = {}): UseOneCommeReturn {
  const {
    enabled = true,
    mode = 'diff',
    onComment,
    oneCommePort = 11180,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<OneCommeComment[]>([]);

  const onCommentRef = useRef(onComment);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // onCommentの参照を更新
  useEffect(() => {
    onCommentRef.current = onComment;
  }, [onComment]);

  // コメントを処理する関数
  const handleComments = useCallback((data: unknown) => {
    if (!Array.isArray(data)) return;

    const newComments: OneCommeComment[] = [];

    for (const item of data) {
      // わんコメのコメントデータ構造を解析
      const commentData = item?.data || item;
      const id = commentData?.id || `${Date.now()}-${Math.random()}`;

      // 既に処理済みのコメントはスキップ
      if (processedIdsRef.current.has(id)) continue;
      processedIdsRef.current.add(id);

      const comment: OneCommeComment = {
        id,
        name: commentData?.name || commentData?.author?.name || 'Unknown',
        comment: commentData?.comment || commentData?.message || '',
        profileImage: commentData?.profileImage || commentData?.author?.profileImage,
        service: commentData?.service || item?.service,
        timestamp: commentData?.timestamp || Date.now(),
        // 追加情報
        userId: commentData?.userId || commentData?.author?.id,
        displayName: commentData?.displayName || commentData?.author?.displayName,
        screenName: commentData?.screenName || commentData?.author?.screenName,
        nickname: commentData?.nickname,
        badges: commentData?.badges,
        isOwner: commentData?.isOwner,
        isSupporter: commentData?.isSupporter,
        hasGift: commentData?.hasGift,
        liveId: commentData?.liveId,
      };

      if (comment.comment) {
        newComments.push(comment);
      }
    }

    if (newComments.length > 0) {
      setComments((prev) => [...prev, ...newComments]);

      // 各コメントに対してコールバックを呼び出し
      for (const comment of newComments) {
        onCommentRef.current?.(comment);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const initOneSDK = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // OneSDKスクリプトを動的に読み込み
        const scriptUrl = `http://localhost:${oneCommePort}/templates/preset/__origin/js/onesdk.js`;

        // 既存のスクリプトをチェック
        const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

        if (!existingScript) {
          const script = document.createElement('script');
          script.src = scriptUrl;
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('OneSDKの読み込みに失敗しました'));
            document.head.appendChild(script);
          });
        }

        // OneSDKが利用可能になるまで待機
        let attempts = 0;
        while (!window.OneSDK && attempts < 50) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }

        if (!window.OneSDK) {
          throw new Error('OneSDKが見つかりません');
        }

        if (!mounted) return;

        // OneSDKを初期化
        window.OneSDK.setup({
          mode,
          permissions: ['comments'],
        });

        await window.OneSDK.ready();
        await window.OneSDK.connect();

        if (!mounted) return;

        // コメントを購読
        window.OneSDK.subscribe({
          action: 'comments',
          callback: handleComments,
        });

        setIsConnected(true);
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'わんコメへの接続に失敗しました';
        setError(message);
        setIsLoading(false);
        console.error('OneSDK initialization error:', err);
      }
    };

    initOneSDK();

    return () => {
      mounted = false;
    };
  }, [enabled, mode, oneCommePort, handleComments]);

  return {
    isConnected,
    isLoading,
    error,
    comments,
  };
}
