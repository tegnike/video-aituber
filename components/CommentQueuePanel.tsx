/**
 * コメントキューパネルコンポーネント
 * @see .kiro/specs/comment-queue-control/design.md - CommentQueuePanel
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 4.2, 4.3
 */
'use client';

import Image from 'next/image';
import type { QueuedComment } from '@/lib/remoteState';

export interface CommentQueuePanelProps {
  /** コメントキュー */
  commentQueue: QueuedComment[];
  /** コメント送信ハンドラ */
  onSendComment: (commentId: string) => void;
  /** 現在送信中のコメントID */
  sendingCommentId?: string;
}

/**
 * 受信時刻を「HH:MM」形式にフォーマット
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function CommentQueuePanel({
  commentQueue,
  onSendComment,
  sendingCommentId,
}: CommentQueuePanelProps) {
  const pendingCount = commentQueue.filter((c) => !c.isSent).length;

  const handleSendClick = (comment: QueuedComment) => {
    // 送信済みまたは送信中の場合は何もしない
    if (comment.isSent || sendingCommentId === comment.id) return;
    // 確認なしで即座に送信（Requirement 3.3）
    onSendComment(comment.id);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* ヘッダー: タイトルと件数表示 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white/70 text-sm">コメントキュー</h2>
        <span className="text-white/50 text-xs">
          {pendingCount > 0 ? `${pendingCount} 件` : 'コメントなし / 0 件'}
        </span>
      </div>

      {/* コメント一覧 */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {commentQueue.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            コメントなし / 0 件
          </p>
        ) : (
          commentQueue.map((comment) => {
            const isSending = sendingCommentId === comment.id;
            const isDisabled = comment.isSent || isSending;

            return (
              <div
                key={comment.id}
                data-testid="comment-item"
                className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                  comment.isSent
                    ? 'bg-gray-700/30 opacity-50 sent'
                    : 'bg-gray-700/50'
                }`}
              >
                {/* プロフィール画像 */}
                <div className="flex-shrink-0 w-8 h-8">
                  {comment.profileImage ? (
                    <Image
                      src={comment.profileImage}
                      alt="ユーザーアバター"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-white/50 text-xs">
                        {comment.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* コメント情報 */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-xs font-medium truncate">
                      {comment.name}
                    </span>
                    <span className="text-white/30 text-xs">
                      {formatTime(comment.receivedAt)}
                    </span>
                  </div>
                  <p className="text-white text-sm mt-0.5 break-words">
                    {comment.comment}
                  </p>
                </div>

                {/* 送信ボタン */}
                <button
                  onClick={() => handleSendClick(comment)}
                  disabled={isDisabled}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded transition-colors ${
                    isDisabled
                      ? 'bg-gray-600 text-white/30 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSending ? '送信中...' : comment.isSent ? '送信済' : '送信'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
