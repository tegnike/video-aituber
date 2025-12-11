/**
 * CommentQueuePanel Component Tests
 * @see .kiro/specs/comment-queue-control/design.md - CommentQueuePanel
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 4.2, 4.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentQueuePanel from './CommentQueuePanel';
import type { QueuedComment } from '@/lib/remoteState';

describe('CommentQueuePanel', () => {
  const mockOnSendComment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockComment = (overrides: Partial<QueuedComment> = {}): QueuedComment => ({
    id: `comment-${Date.now()}`,
    name: 'テストユーザー',
    comment: 'テストコメント',
    receivedAt: Date.now(),
    isSent: false,
    ...overrides,
  });

  describe('キュー一覧表示 (Requirement 1.1, 1.2, 1.3, 1.4)', () => {
    it('コメント一覧を表示する', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1', name: 'ユーザーA', comment: 'コメントA' }),
        createMockComment({ id: '2', name: 'ユーザーB', comment: 'コメントB' }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      expect(screen.getByText('ユーザーA')).toBeInTheDocument();
      expect(screen.getByText('コメントA')).toBeInTheDocument();
      expect(screen.getByText('ユーザーB')).toBeInTheDocument();
      expect(screen.getByText('コメントB')).toBeInTheDocument();
    });

    it('コメント件数を表示する', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1' }),
        createMockComment({ id: '2' }),
        createMockComment({ id: '3' }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      expect(screen.getByText(/3.*件/)).toBeInTheDocument();
    });

    it('キューが空の場合に空状態を表示する', () => {
      render(<CommentQueuePanel commentQueue={[]} onSendComment={mockOnSendComment} />);

      // 複数の要素が「コメントなし」を表示するので、getAllByTextを使用
      const emptyMessages = screen.getAllByText(/コメントなし|0.*件/);
      expect(emptyMessages.length).toBeGreaterThan(0);
    });

    it('受信時刻を表示する', () => {
      const receivedAt = new Date(2025, 0, 15, 14, 30, 0).getTime();
      const comments: QueuedComment[] = [
        createMockComment({ id: '1', receivedAt }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      // 時刻表示があることを確認（フォーマットは実装依存）
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });
  });

  describe('送信ボタン (Requirement 3.2, 3.3)', () => {
    it('各コメントに送信ボタンを表示する', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1' }),
        createMockComment({ id: '2' }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const sendButtons = screen.getAllByRole('button', { name: /送信/ });
      expect(sendButtons).toHaveLength(2);
    });

    it('送信ボタンクリックでonSendCommentが呼ばれる', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: 'test-id-1' }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const sendButton = screen.getByRole('button', { name: /送信/ });
      fireEvent.click(sendButton);

      expect(mockOnSendComment).toHaveBeenCalledWith('test-id-1');
    });

    it('クリック時に確認ダイアログなしで即座に送信する', () => {
      // 確認ダイアログのモック
      const confirmSpy = vi.spyOn(window, 'confirm');

      const comments: QueuedComment[] = [
        createMockComment({ id: 'test-id-1' }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const sendButton = screen.getByRole('button', { name: /送信/ });
      fireEvent.click(sendButton);

      // window.confirmが呼ばれていないことを確認
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(mockOnSendComment).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('送信済み表示 (Requirement 4.2, 4.3)', () => {
    it('送信済みコメントを視覚的に区別する', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1', isSent: false }),
        createMockComment({ id: '2', isSent: true }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      // 送信済みコメントに区別のためのスタイルが適用されていることを確認
      // 具体的なスタイル（透明度、背景色など）は実装依存
      const commentItems = screen.getAllByTestId('comment-item');
      expect(commentItems[1]).toHaveClass(/sent|opacity/);
    });

    it('送信済みコメントの送信ボタンは非活性', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1', isSent: true }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const sendButton = screen.getByRole('button', { name: /送信/ });
      expect(sendButton).toBeDisabled();
    });

    it('送信済みコメントの送信ボタンをクリックしてもonSendCommentが呼ばれない', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1', isSent: true }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const sendButton = screen.getByRole('button', { name: /送信/ });
      fireEvent.click(sendButton);

      expect(mockOnSendComment).not.toHaveBeenCalled();
    });
  });

  describe('送信中の状態表示', () => {
    it('送信中のコメントのボタンが無効化される', () => {
      const comments: QueuedComment[] = [
        createMockComment({ id: '1' }),
      ];

      render(
        <CommentQueuePanel
          commentQueue={comments}
          onSendComment={mockOnSendComment}
          sendingCommentId="1"
        />
      );

      const sendButton = screen.getByRole('button', { name: /送信中/ });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('プロフィール画像表示', () => {
    it('プロフィール画像がある場合に表示する', () => {
      const comments: QueuedComment[] = [
        createMockComment({
          id: '1',
          profileImage: 'https://example.com/avatar.png',
        }),
      ];

      render(<CommentQueuePanel commentQueue={comments} onSendComment={mockOnSendComment} />);

      const avatar = screen.getByAltText(/ユーザー|avatar/i);
      expect(avatar).toBeInTheDocument();
      // Next.js Imageコンポーネントはsrcを変換するため、元のURLを含むかで確認
      expect(avatar.getAttribute('src')).toContain('avatar.png');
    });
  });
});
