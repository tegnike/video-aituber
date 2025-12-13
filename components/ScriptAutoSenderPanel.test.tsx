/**
 * ScriptAutoSenderPanel Component Tests (Preset Feature)
 * @see .kiro/specs/preset-sequence-sender/design.md
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScriptAutoSenderPanel from './ScriptAutoSenderPanel';
import type { PresetSequenceInfo, ScriptSequence } from '@/lib/scriptTypes';

// fetch モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// テスト用プリセットデータ
const mockPresets: PresetSequenceInfo[] = [
  {
    id: 'test-sequence',
    name: 'テストシーケンス',
    fileName: 'test-sequence.json',
    scriptCount: 3,
  },
  {
    id: 'another-sequence',
    name: '別のシーケンス',
    fileName: 'another-sequence.json',
    scriptCount: 5,
  },
];

const mockSequence: ScriptSequence = {
  name: 'テストシーケンス',
  scripts: [
    { id: '1', label: '台本1', text: 'テスト台本1' },
    { id: '2', label: '台本2', text: 'テスト台本2' },
    { id: '3', label: '台本3', text: 'テスト台本3' },
  ],
  defaultInterval: 3,
};

describe('ScriptAutoSenderPanel - プリセット機能', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでプリセット一覧を返す
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/preset-sequences') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ presets: mockPresets }),
        });
      }
      if (url.startsWith('/api/preset-sequences?id=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSequence),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('タスク3.1: プリセット一覧取得のステート管理 (Requirement 1.1)', () => {
    it('コンポーネントマウント時にプリセット一覧をAPIから取得する', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/preset-sequences');
      });
    });

    it('プリセット一覧取得中はローディング状態を表示する', async () => {
      // フェッチを遅延させる
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ presets: mockPresets }),
                }),
              100
            )
          )
      );

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      // ローディング状態が表示される
      expect(screen.getByText(/読み込み中/)).toBeInTheDocument();

      // 読み込み完了を待つ
      await waitFor(() => {
        expect(screen.queryByText(/読み込み中/)).not.toBeInTheDocument();
      });
    });

    it('プリセット一覧取得失敗時にエラーメッセージを保持する', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        // エラーメッセージが表示される（元のエラーメッセージまたはデフォルトメッセージ）
        expect(screen.getByText(/Network error|プリセットの取得に失敗/)).toBeInTheDocument();
      });
    });
  });

  describe('タスク3.2: プリセット一覧の表示UI (Requirements 1.2, 1.3, 1.4)', () => {
    it('各プリセットのシーケンス名と台本件数を表示する', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
        expect(screen.getByText(/3件/)).toBeInTheDocument();
        expect(screen.getByText('別のシーケンス')).toBeInTheDocument();
        expect(screen.getByText(/5件/)).toBeInTheDocument();
      });
    });

    it('プリセットが存在しない場合は「プリセットがありません」を表示する', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ presets: [] }),
        })
      );

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/プリセットがありません/)).toBeInTheDocument();
      });
    });
  });

  describe('タスク3.3: プリセット選択時の読み込み処理 (Requirements 2.1, 2.2, 2.3, 2.4)', () => {
    it('プリセットクリックでAPIから詳細を取得する', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/preset-sequences?id=test-sequence'
        );
      });
    });

    it('プリセット詳細取得中はローディング状態を表示する', async () => {
      // 詳細取得を遅延させる
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/preset-sequences') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presets: mockPresets }),
          });
        }
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(mockSequence),
              }),
            100
          )
        );
      });

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      // ローディング状態が表示される（選択したプリセットに対して）
      await waitFor(() => {
        expect(screen.getByTestId('preset-loading-test-sequence')).toBeInTheDocument();
      });
    });

    it('読み込み完了後に制御ボタン（開始など）が表示される', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /開始/ })).toBeInTheDocument();
      });
    });

    it('読み込み失敗時はエラーメッセージを表示する', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/preset-sequences') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ presets: mockPresets }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'プリセットが見つかりません' }),
        });
      });

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText(/プリセットが見つかりません/)).toBeInTheDocument();
      });
    });
  });

  describe('タスク3.4: プリセット一覧の更新機能 (Requirements 3.1, 3.2, 3.3)', () => {
    it('更新ボタンを表示する', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument();
      });
    });

    it('更新ボタンクリックでAPIを再呼び出しする', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /更新/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith('/api/preset-sequences');
      });
    });

    it('更新処理中はボタンを無効化する', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ presets: mockPresets }),
                }),
              100
            )
          )
      );

      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      // 初回読み込み完了を待つ
      await waitFor(
        () => {
          expect(screen.queryByText(/読み込み中/)).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );

      const refreshButton = screen.getByRole('button', { name: /更新/ });
      fireEvent.click(refreshButton);

      // 更新中はボタンが無効化される
      expect(refreshButton).toBeDisabled();

      // 更新完了後は有効化される
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('タスク3.5: プリセット選択とファイル選択の排他制御 (Requirements 4.1, 4.2, 4.3)', () => {
    it('既存のファイル選択ボタンを維持する', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      expect(
        screen.getByRole('button', { name: /シーケンスファイルを選択/ })
      ).toBeInTheDocument();
    });

    it('プリセット選択後にシーケンス情報が表示される', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      await waitFor(() => {
        // シーケンス名と台本件数が表示される
        expect(screen.getByText(/3件の台本/)).toBeInTheDocument();
      });
    });

    it('プリセット選択状態がハイライト表示される', async () => {
      render(<ScriptAutoSenderPanel onScriptSend={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('テストシーケンス')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('テストシーケンス');
      fireEvent.click(presetButton);

      await waitFor(() => {
        // 選択されたプリセットのコンテナに選択状態のスタイルが適用される
        const presetItem = presetButton.closest('[data-preset-id="test-sequence"]');
        expect(presetItem).toHaveAttribute('data-selected', 'true');
      });
    });
  });
});
