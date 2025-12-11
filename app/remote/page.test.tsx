/**
 * リモート操作ページのテスト
 * @see .kiro/specs/remote-control-panel/design.md - RemoteControlPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RemoteControlPage from './page';

// useRemoteSyncフックのモック
vi.mock('@/hooks/useRemoteSync', () => ({
  useRemoteSync: vi.fn(),
}));

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useRemoteSync } from '@/hooks/useRemoteSync';
import type { AppState } from '@/lib/remoteState';

const mockUseRemoteSync = vi.mocked(useRemoteSync);

describe('RemoteControlPage', () => {
  const mockSendCommand = vi.fn();

  const createMockState = (overrides?: Partial<AppState>): AppState => ({
    hasStarted: false,
    screenMode: null,
    isLoadingBackground: false,
    isLoadingControlVideo: false,
    controlVideoType: null,
    oneCommeEnabled: false,
    oneCommeConnected: false,
    isScriptSending: false,
    uiVisibility: {
      controls: true,
      chatHistory: true,
      chatInput: true,
    },
    commentQueue: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendCommand.mockResolvedValue(undefined);
    // ScriptPanel用のfetchモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ scripts: [] }),
    });
  });

  describe('接続状態の表示', () => {
    it('接続待機中の表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: null,
        isConnected: false,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('メイン画面に接続中...')).toBeInTheDocument();
    });

    it('接続済みの状態表示', async () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState(),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('リモート操作パネル')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toHaveTextContent('接続中');
    });

    it('エラー時の表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: null,
        isConnected: false,
        error: '再接続に失敗しました',
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('再接続に失敗しました')).toBeInTheDocument();
    });
  });

  describe('状態購読', () => {
    it('SSE経由で受信した状態を表示', async () => {
      const mockState = createMockState({
        hasStarted: true,
        screenMode: 'standby',
      });

      mockUseRemoteSync.mockReturnValue({
        state: mockState,
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      await waitFor(() => {
        expect(screen.getByTestId('screen-mode')).toHaveTextContent('待機画面');
      });
    });
  });

  describe('3.2 画面モード表示', () => {
    // Note: 画面モード選択UIは削除され、待機画面が自動表示されるようになりました
    // @see commit: ced9a2d feat: 画面モード選択の削除と待機画面の自動表示を実装

    it('未開始時は「未開始」と表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: false }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('screen-mode')).toHaveTextContent('未開始');
    });

    it('開始済み時は現在のモードを表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true, screenMode: 'room' }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('screen-mode')).toHaveTextContent('初期画面');
    });

    it('待機画面モード時は「待機画面」と表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true, screenMode: 'standby' }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('screen-mode')).toHaveTextContent('待機画面');
    });
  });

  describe('3.3 コントロールボタン', () => {
    it('開始/終了ボタンを表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true, screenMode: 'standby' }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByRole('button', { name: '開始' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '終了' })).toBeInTheDocument();
    });

    it('開始ボタン押下でcontrolVideoコマンドを送信', async () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true, screenMode: 'standby' }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      fireEvent.click(screen.getByRole('button', { name: '開始' }));

      await waitFor(() => {
        expect(mockSendCommand).toHaveBeenCalledWith({
          type: 'controlVideo',
          action: 'start',
        });
      });
    });

    it('ローディング中は操作を無効化', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          screenMode: 'standby',
          isLoadingControlVideo: true,
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByRole('button', { name: /開始/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /終了/ })).toBeDisabled();
    });

    it('再生中は操作を無効化', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          screenMode: 'standby',
          controlVideoType: 'start',
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByRole('button', { name: /開始/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /終了/ })).toBeDisabled();
    });
  });

  describe('3.4 状態表示コンポーネント', () => {
    it('接続状態インジケーターを表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('接続中');
    });

    it('ローディング状態を表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          isLoadingControlVideo: true,
          controlVideoType: 'start',
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('loading-status')).toHaveTextContent('読み込み中');
    });

    it('再生中のコントロール動画アクション名を表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          controlVideoType: 'start',
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('playing-status')).toHaveTextContent('開始動画再生中');
    });
  });

  describe('3.5 わんコメ連携切替ボタン', () => {
    it('ON/OFF切替ボタンを表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByRole('button', { name: /わんコメ/ })).toBeInTheDocument();
    });

    it('切替時にtoggleOneCommeコマンドを送信', async () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true, oneCommeEnabled: false }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      fireEvent.click(screen.getByRole('button', { name: /わんコメ/ }));

      await waitFor(() => {
        expect(mockSendCommand).toHaveBeenCalledWith({
          type: 'toggleOneComme',
          enabled: true,
        });
      });
    });

    it('接続状態を表示', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          oneCommeEnabled: true,
          oneCommeConnected: true,
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByTestId('onecomme-status')).toHaveTextContent('接続中');
    });
  });

  describe('3.6 台本パネル統合', () => {
    it('台本パネルが表示される', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('台本')).toBeInTheDocument();
    });
  });

  describe('4. パネル表示', () => {
    it('すべてのパネルが表示される', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      // 台本パネル、自動送信パネル、メッセージフォームがすべて表示される
      expect(screen.getByText('台本', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByText('自動送信', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByText('メッセージ送信')).toBeInTheDocument();
    });
  });

  describe('コメントキューパネル統合 (comment-queue-control 3.3)', () => {
    it('コメントキューパネルが表示される', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({ hasStarted: true }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('コメントキュー')).toBeInTheDocument();
    });

    it('コメントキューの内容を表示する', () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          commentQueue: [
            {
              id: 'comment-1',
              name: 'テストユーザー',
              comment: 'テストコメント',
              receivedAt: Date.now(),
              isSent: false,
            },
          ],
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('テストコメント')).toBeInTheDocument();
    });

    it('送信ボタンクリックでsendQueuedCommentコマンドを送信', async () => {
      mockUseRemoteSync.mockReturnValue({
        state: createMockState({
          hasStarted: true,
          commentQueue: [
            {
              id: 'comment-1',
              name: 'キューユーザー',
              comment: 'キューコメント',
              receivedAt: Date.now(),
              isSent: false,
            },
          ],
        }),
        isConnected: true,
        error: null,
        sendCommand: mockSendCommand,
      });

      render(<RemoteControlPage />);

      // コメントキューパネル内の送信ボタンを探す
      const commentItem = screen.getByText('キューコメント').closest('[data-testid="comment-item"]');
      const sendButton = commentItem?.querySelector('button');
      expect(sendButton).not.toBeNull();
      fireEvent.click(sendButton!);

      await waitFor(() => {
        expect(mockSendCommand).toHaveBeenCalledWith({
          type: 'sendQueuedComment',
          commentId: 'comment-1',
        });
      });
    });
  });
});
