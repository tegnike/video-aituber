'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// OneSDKの型定義
interface OneCommeComment {
  id: string;
  name: string;
  comment: string;
  profileImage?: string;
  service?: string;
  timestamp?: number;
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
