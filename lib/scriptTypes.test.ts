import { describe, it, expect } from 'vitest';
import {
  parseScriptSequence,
  DEFAULT_SEND_INTERVAL,
  ScriptSequence,
  PresetSequenceInfo,
  extractPresetInfo,
} from './scriptTypes';

describe('parseScriptSequence', () => {
  // 正常系テスト
  describe('正常なJSONファイルのパース', () => {
    it('最小限のシーケンスをパースできる', () => {
      const data = {
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テストメッセージ' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.error).toBeNull();
      expect(result.sequence).not.toBeNull();
      expect(result.sequence?.scripts).toHaveLength(1);
      expect(result.sequence?.scripts[0].id).toBe('test-1');
    });

    it('name付きのシーケンスをパースできる', () => {
      const data = {
        name: '配信オープニング',
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テストメッセージ' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.error).toBeNull();
      expect(result.sequence?.name).toBe('配信オープニング');
    });

    it('defaultInterval付きのシーケンスをパースできる', () => {
      const data = {
        defaultInterval: 10,
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テストメッセージ' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.error).toBeNull();
      expect(result.sequence?.defaultInterval).toBe(10);
    });

    it('複数の台本を含むシーケンスをパースできる', () => {
      const data = {
        name: 'テストシーケンス',
        defaultInterval: 5,
        scripts: [
          { id: 'test-1', label: '挨拶', text: 'こんにちは' },
          { id: 'test-2', label: 'お礼', text: 'ありがとう', emotion: 'happy' },
          { id: 'test-3', label: '締め', text: 'さようなら' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.error).toBeNull();
      expect(result.sequence?.scripts).toHaveLength(3);
      expect(result.sequence?.scripts[1].emotion).toBe('happy');
    });

    it('emotion付きの台本をパースできる', () => {
      const data = {
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト', emotion: 'happy' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.error).toBeNull();
      expect(result.sequence?.scripts[0].emotion).toBe('happy');
    });
  });

  // 異常系テスト: scriptsプロパティがない
  describe('scriptsプロパティがない場合', () => {
    it('scriptsがないオブジェクトでエラーを返す', () => {
      const data = { name: 'テスト' };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('scriptsプロパティが見つかりません');
    });

    it('空オブジェクトでエラーを返す', () => {
      const data = {};

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('scriptsプロパティが見つかりません');
    });
  });

  // 異常系テスト: 空のscripts配列
  describe('空のscripts配列の場合', () => {
    it('空配列でエラーを返す', () => {
      const data = { scripts: [] };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('台本が1件以上必要です');
    });
  });

  // 異常系テスト: 個別台本のバリデーションエラー
  describe('個別台本のバリデーションエラー', () => {
    it('idがない台本でエラーを返す', () => {
      const data = {
        scripts: [
          { label: 'テスト', text: 'テストメッセージ' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toContain('1番目の台本');
      expect(result.error).toContain('id');
    });

    it('labelがない台本でエラーを返す', () => {
      const data = {
        scripts: [
          { id: 'test-1', text: 'テストメッセージ' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toContain('1番目の台本');
      expect(result.error).toContain('label');
    });

    it('textがない台本でエラーを返す', () => {
      const data = {
        scripts: [
          { id: 'test-1', label: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toContain('1番目の台本');
      expect(result.error).toContain('text');
    });

    it('2番目の台本にエラーがある場合、位置情報を含む', () => {
      const data = {
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'OK' },
          { id: 'test-2', label: 'テスト' }, // textがない
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toContain('2番目の台本');
    });
  });

  // 異常系テスト: 不正なデータ型
  describe('不正なデータ型', () => {
    it('nullでエラーを返す', () => {
      const result = parseScriptSequence(null);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('設定データはオブジェクトである必要があります');
    });

    it('undefinedでエラーを返す', () => {
      const result = parseScriptSequence(undefined);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('設定データはオブジェクトである必要があります');
    });

    it('文字列でエラーを返す', () => {
      const result = parseScriptSequence('invalid');

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('設定データはオブジェクトである必要があります');
    });

    it('scriptsが配列でない場合エラーを返す', () => {
      const data = { scripts: 'not-array' };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('scripts は配列である必要があります');
    });

    it('nameが文字列でない場合エラーを返す', () => {
      const data = {
        name: 123,
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('name は文字列である必要があります');
    });

    it('defaultIntervalが数値でない場合エラーを返す', () => {
      const data = {
        defaultInterval: '5',
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence).toBeNull();
      expect(result.error).toBe('defaultInterval は数値である必要があります');
    });
  });

  // defaultIntervalの有無による動作の違い
  describe('defaultIntervalの有無による動作', () => {
    it('defaultIntervalがない場合はundefined', () => {
      const data = {
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence?.defaultInterval).toBeUndefined();
    });

    it('defaultIntervalが負の値の場合は0に正規化される', () => {
      const data = {
        defaultInterval: -5,
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence?.defaultInterval).toBe(0);
    });

    it('defaultIntervalが0の場合はそのまま0', () => {
      const data = {
        defaultInterval: 0,
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テスト' },
        ],
      };

      const result = parseScriptSequence(data);

      expect(result.sequence?.defaultInterval).toBe(0);
    });
  });
});

describe('DEFAULT_SEND_INTERVAL', () => {
  it('デフォルト送信間隔は5秒', () => {
    expect(DEFAULT_SEND_INTERVAL).toBe(5);
  });
});

// プリセットメタ情報のテスト
describe('extractPresetInfo', () => {
  describe('正常系', () => {
    it('シーケンス名付きのファイルからメタ情報を抽出できる', () => {
      const fileName = 'test-sequence.json';
      const sequence: ScriptSequence = {
        name: '配信オープニング',
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テストメッセージ' },
          { id: 'test-2', label: 'テスト2', text: 'テストメッセージ2' },
        ],
        defaultInterval: 5,
      };

      const result = extractPresetInfo(fileName, sequence);

      expect(result.id).toBe('test-sequence');
      expect(result.name).toBe('配信オープニング');
      expect(result.fileName).toBe('test-sequence.json');
      expect(result.scriptCount).toBe(2);
    });

    it('シーケンス名がない場合はファイル名をnameとして使用する', () => {
      const fileName = 'my-preset.json';
      const sequence: ScriptSequence = {
        scripts: [
          { id: 'test-1', label: 'テスト', text: 'テストメッセージ' },
        ],
      };

      const result = extractPresetInfo(fileName, sequence);

      expect(result.id).toBe('my-preset');
      expect(result.name).toBe('my-preset');
      expect(result.fileName).toBe('my-preset.json');
      expect(result.scriptCount).toBe(1);
    });

    it('台本件数を正しくカウントする', () => {
      const fileName = 'long-sequence.json';
      const sequence: ScriptSequence = {
        name: '長いシーケンス',
        scripts: [
          { id: '1', label: '1', text: '1' },
          { id: '2', label: '2', text: '2' },
          { id: '3', label: '3', text: '3' },
          { id: '4', label: '4', text: '4' },
          { id: '5', label: '5', text: '5' },
        ],
      };

      const result = extractPresetInfo(fileName, sequence);

      expect(result.scriptCount).toBe(5);
    });
  });

  describe('PresetSequenceInfo型', () => {
    it('必要なプロパティを全て持つ', () => {
      const info: PresetSequenceInfo = {
        id: 'test-id',
        name: 'テスト名',
        fileName: 'test.json',
        scriptCount: 10,
      };

      expect(info.id).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.fileName).toBeDefined();
      expect(info.scriptCount).toBeDefined();
    });
  });
});
