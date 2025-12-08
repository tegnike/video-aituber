/**
 * 台本データの型定義
 */

/**
 * 台本データ
 * @see design.md - Data Models
 */
export interface Script {
  /** 台本の一意識別子 */
  id: string;
  /** UI表示用ラベル */
  label: string;
  /** 読み上げテキスト */
  text: string;
  /** 感情パラメータ（省略可能）- 省略時は "normal" */
  emotion?: string;
  /** 追加パラメータ（拡張用） */
  params?: Record<string, unknown>;
}

/**
 * 台本設定ファイルの構造
 */
export interface ScriptsConfig {
  scripts: Script[];
}

/** 感情パラメータのデフォルト値 */
export const DEFAULT_EMOTION = 'normal';

/**
 * 台本データのバリデーション
 * @returns エラーメッセージの配列（空なら有効）
 */
export function validateScript(script: unknown): string[] {
  const errors: string[] = [];

  if (!script || typeof script !== 'object') {
    return ['台本データはオブジェクトである必要があります'];
  }

  const s = script as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.length === 0) {
    errors.push('id は必須の文字列です');
  }

  if (typeof s.label !== 'string' || s.label.length === 0) {
    errors.push('label は必須の文字列です');
  }

  if (typeof s.text !== 'string' || s.text.length === 0) {
    errors.push('text は必須の文字列です');
  }

  if (s.emotion !== undefined && typeof s.emotion !== 'string') {
    errors.push('emotion は文字列である必要があります');
  }

  if (s.params !== undefined && (typeof s.params !== 'object' || s.params === null)) {
    errors.push('params はオブジェクトである必要があります');
  }

  return errors;
}

/**
 * 設定ファイルから読み込んだデータをパースしてScriptsConfigを返す
 * @param data - JSONパース済みのデータ
 * @returns パース結果と有効な台本の配列
 */
export function parseScriptsConfig(data: unknown): {
  scripts: Script[];
  errors: Array<{ index: number; errors: string[] }>;
} {
  const result: Script[] = [];
  const parseErrors: Array<{ index: number; errors: string[] }> = [];

  if (!data || typeof data !== 'object') {
    return { scripts: [], errors: [{ index: -1, errors: ['設定データはオブジェクトである必要があります'] }] };
  }

  const config = data as Record<string, unknown>;
  const scripts = config.scripts;

  if (!Array.isArray(scripts)) {
    return { scripts: [], errors: [{ index: -1, errors: ['scripts は配列である必要があります'] }] };
  }

  scripts.forEach((script, index) => {
    const errors = validateScript(script);
    if (errors.length > 0) {
      parseErrors.push({ index, errors });
    } else {
      result.push(script as Script);
    }
  });

  return { scripts: result, errors: parseErrors };
}
