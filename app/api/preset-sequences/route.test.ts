/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// fsモジュールをモック
vi.mock('fs');

const mockedFs = vi.mocked(fs);

// テスト用のサンプルシーケンスデータ
const validSequence1 = {
  name: 'テストシーケンス1',
  scripts: [
    { id: 'test-1', label: 'テスト1', text: 'テストメッセージ1' },
    { id: 'test-2', label: 'テスト2', text: 'テストメッセージ2' },
  ],
  defaultInterval: 5,
};

const validSequence2 = {
  scripts: [
    { id: 'test-3', label: 'テスト3', text: 'テストメッセージ3' },
  ],
};

const invalidSequence = {
  name: '不正なシーケンス',
  // scriptsプロパティがない
};

/**
 * NextRequestのモックを作成
 */
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('/api/preset-sequences', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/preset-sequences - プリセット一覧取得', () => {
    describe('正常系', () => {
      it('samplesフォルダ内のJSONファイル一覧を返す', async () => {
        // @requirements 5.1, 5.2, 5.3
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue(['sequence1.json', 'sequence2.json'] as unknown as fs.Dirent[]);
        mockedFs.readFileSync.mockImplementation((filePath) => {
          const fileName = path.basename(filePath as string);
          if (fileName === 'sequence1.json') {
            return JSON.stringify(validSequence1);
          }
          return JSON.stringify(validSequence2);
        });

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.presets).toHaveLength(2);
        expect(data.presets[0]).toMatchObject({
          id: 'sequence1',
          name: 'テストシーケンス1',
          fileName: 'sequence1.json',
          scriptCount: 2,
        });
        expect(data.presets[1]).toMatchObject({
          id: 'sequence2',
          name: 'sequence2', // nameがないのでファイル名
          fileName: 'sequence2.json',
          scriptCount: 1,
        });
      });

      it('JSONファイルのみをフィルタリングする', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([
          'sequence1.json',
          'readme.md',
          'image.png',
          'sequence2.json',
        ] as unknown as fs.Dirent[]);
        mockedFs.readFileSync.mockImplementation((filePath) => {
          const fileName = path.basename(filePath as string);
          if (fileName === 'sequence1.json') {
            return JSON.stringify(validSequence1);
          }
          return JSON.stringify(validSequence2);
        });

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(data.presets).toHaveLength(2);
        // JSONファイルのみが含まれる
        expect(data.presets.map((p: { fileName: string }) => p.fileName)).toEqual([
          'sequence1.json',
          'sequence2.json',
        ]);
      });
    });

    describe('異常系', () => {
      it('samplesフォルダが存在しない場合は空配列を返す', async () => {
        mockedFs.existsSync.mockReturnValue(false);

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.presets).toEqual([]);
      });

      it('JSONファイルが存在しない場合は空配列を返す', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([] as unknown as fs.Dirent[]);

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.presets).toEqual([]);
      });

      it('パースエラーのファイルはスキップして他を返す', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([
          'valid.json',
          'invalid.json',
        ] as unknown as fs.Dirent[]);
        mockedFs.readFileSync.mockImplementation((filePath) => {
          const fileName = path.basename(filePath as string);
          if (fileName === 'valid.json') {
            return JSON.stringify(validSequence1);
          }
          return JSON.stringify(invalidSequence);
        });

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.presets).toHaveLength(1);
        expect(data.presets[0].id).toBe('valid');
      });

      it('読み込みエラーのファイルはスキップして他を返す', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([
          'valid.json',
          'error.json',
        ] as unknown as fs.Dirent[]);
        mockedFs.readFileSync.mockImplementation((filePath) => {
          const fileName = path.basename(filePath as string);
          if (fileName === 'error.json') {
            throw new Error('File read error');
          }
          return JSON.stringify(validSequence1);
        });

        const request = createMockRequest('/api/preset-sequences');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.presets).toHaveLength(1);
        expect(data.presets[0].id).toBe('valid');
      });
    });
  });

  describe('GET /api/preset-sequences?id={id} - 個別プリセット取得', () => {
    describe('正常系', () => {
      it('指定したIDのシーケンスを返す', async () => {
        // @requirements 5.4
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(validSequence1));

        const request = createMockRequest('/api/preset-sequences?id=test-sequence');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe('テストシーケンス1');
        expect(data.scripts).toHaveLength(2);
        expect(data.defaultInterval).toBe(5);
      });
    });

    describe('異常系', () => {
      it('存在しないIDの場合は404を返す', async () => {
        // @requirements 5.4
        mockedFs.existsSync.mockReturnValue(false);

        const request = createMockRequest('/api/preset-sequences?id=not-found');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain('not-found');
      });

      it('パースエラーの場合は500を返す', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidSequence));

        const request = createMockRequest('/api/preset-sequences?id=invalid');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
      });

      it('ファイル読み込みエラーの場合は500を返す', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockImplementation(() => {
          throw new Error('File read error');
        });

        const request = createMockRequest('/api/preset-sequences?id=error-file');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
      });
    });
  });
});
