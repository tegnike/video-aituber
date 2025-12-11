/**
 * MessageFormPanel Component Tests
 * @see .kiro/specs/remote-message-form/design.md - MessageFormPanel
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageFormPanel from './MessageFormPanel';

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('MessageFormPanel', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('UI表示 (Requirements 1.1, 2.1)', () => {
    it('メッセージ入力フィールドを表示する', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      expect(screen.getByPlaceholderText(/メッセージ/i)).toBeInTheDocument();
    });

    it('ユーザー名入力フィールドを表示する', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      expect(screen.getByPlaceholderText(/ユーザー名/i)).toBeInTheDocument();
    });

    it('送信ボタンを表示する', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      expect(screen.getByRole('button', { name: /送信/i })).toBeInTheDocument();
    });
  });

  describe('送信ボタンの無効化 (Requirement 1.3)', () => {
    it('メッセージが空の場合、送信ボタンが無効化される', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      const sendButton = screen.getByRole('button', { name: /送信/i });
      expect(sendButton).toBeDisabled();
    });

    it('メッセージが空白のみの場合も送信ボタンが無効化される', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: '   ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      expect(sendButton).toBeDisabled();
    });

    it('メッセージが入力されると送信ボタンが有効化される', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('メッセージ送信 (Requirement 1.2, 2.4)', () => {
    it('送信ボタンクリックでonMessageSendコールバックが呼ばれる', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onMessageSend).toHaveBeenCalledWith('テストメッセージ', expect.any(String));
      });
    });

    it('ユーザー名が送信時に含まれる', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      const usernameInput = screen.getByPlaceholderText(/ユーザー名/i);

      fireEvent.change(usernameInput, { target: { value: 'カスタムユーザー' } });
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onMessageSend).toHaveBeenCalledWith('テストメッセージ', 'カスタムユーザー');
      });
    });

    it('送信成功後にメッセージフィールドがクリアされる', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i) as HTMLInputElement;
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(messageInput.value).toBe('');
      });
    });
  });

  describe('送信中の状態 (Requirement 1.4)', () => {
    it('isSending=trueの時、送信ボタンが無効化される', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} isSending={true} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信中/i });
      expect(sendButton).toBeDisabled();
    });

    it('isSending=trueの時、ボタンテキストが「送信中...」になる', () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} isSending={true} />);

      expect(screen.getByRole('button', { name: /送信中/i })).toBeInTheDocument();
    });
  });

  describe('Enterキー送信 (Requirement 1.5)', () => {
    it('Enterキー押下でフォームを送信する', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(onMessageSend).toHaveBeenCalled();
      });
    });

    it('日本語入力確定中（isComposing）はEnterキーで送信しない', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      // isComposing=trueでEnterキーを押す（KeyboardEventを直接作成）
      const keyDownEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      // isComposingをtrueに設定（ReadOnlyプロパティのため、definePropertyを使用）
      Object.defineProperty(keyDownEvent, 'isComposing', { value: true });
      Object.defineProperty(keyDownEvent, 'nativeEvent', { value: { isComposing: true } });

      messageInput.dispatchEvent(keyDownEvent);

      // 少し待っても送信されないことを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onMessageSend).not.toHaveBeenCalled();
    });
  });

  describe('ユーザー名の永続化 (Requirement 2.2, 2.3)', () => {
    it('ユーザー名が空の場合、デフォルト値「配信者」を使用する', async () => {
      const onMessageSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onMessageSend).toHaveBeenCalledWith('テストメッセージ', '配信者');
      });
    });

    it('ユーザー名変更時にlocalStorageに保存する', async () => {
      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      const usernameInput = screen.getByPlaceholderText(/ユーザー名/i);
      fireEvent.change(usernameInput, { target: { value: '新しいユーザー' } });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('remote-message-username', '新しいユーザー');
      });
    });

    it('マウント時にlocalStorageからユーザー名を読み込む', () => {
      localStorageMock.getItem.mockReturnValue('保存されたユーザー');

      render(<MessageFormPanel onMessageSend={vi.fn()} />);

      const usernameInput = screen.getByPlaceholderText(/ユーザー名/i) as HTMLInputElement;
      expect(usernameInput.value).toBe('保存されたユーザー');
    });
  });

  describe('エラーハンドリング (Requirement 4.3)', () => {
    it('送信失敗時にエラーメッセージを表示する', async () => {
      const onMessageSend = vi.fn().mockRejectedValue(new Error('送信に失敗しました'));
      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/送信に失敗しました/)).toBeInTheDocument();
      });
    });

    it('エラー後も再送信が可能', async () => {
      const onMessageSend = vi.fn()
        .mockRejectedValueOnce(new Error('送信に失敗しました'))
        .mockResolvedValueOnce(undefined);

      render(<MessageFormPanel onMessageSend={onMessageSend} />);

      const messageInput = screen.getByPlaceholderText(/メッセージ/i);
      fireEvent.change(messageInput, { target: { value: 'テストメッセージ' } });

      const sendButton = screen.getByRole('button', { name: /送信/i });

      // 1回目: 失敗
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(screen.getByText(/送信に失敗しました/)).toBeInTheDocument();
      });

      // 2回目: 成功
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(onMessageSend).toHaveBeenCalledTimes(2);
      });
    });
  });
});
