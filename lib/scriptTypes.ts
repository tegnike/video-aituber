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

// ============================================
// 自動送信機能用の型定義
// ============================================

/** 自動送信の状態 */
export type AutoSenderStatus = 'idle' | 'running' | 'paused' | 'completed';

/** シーケンスファイル形式 */
export interface ScriptSequence {
  /** シーケンス名（任意） */
  name?: string;
  /** 台本配列 */
  scripts: Script[];
  /** デフォルト送信間隔（秒） */
  defaultInterval?: number;
}

/** デフォルトの送信間隔（秒） */
export const DEFAULT_SEND_INTERVAL = 5;

// ============================================
// プリセットシーケンス機能用の型定義
// ============================================

/**
 * プリセットシーケンスのメタ情報
 * @see design.md - Data Models
 */
export interface PresetSequenceInfo {
  /** ファイル識別子（拡張子なしファイル名） */
  id: string;
  /** シーケンス名（JSONのnameフィールド、なければファイル名） */
  name: string;
  /** ファイル名（拡張子付き） */
  fileName: string;
  /** 台本件数 */
  scriptCount: number;
}

/**
 * プリセット一覧APIのレスポンス
 */
export interface PresetSequencesResponse {
  presets: PresetSequenceInfo[];
}

/**
 * ファイル名とシーケンスデータからプリセットメタ情報を抽出する
 * @param fileName - ファイル名（拡張子付き）
 * @param sequence - パース済みのシーケンスデータ
 * @returns プリセットメタ情報
 */
export function extractPresetInfo(fileName: string, sequence: ScriptSequence): PresetSequenceInfo {
  // 拡張子を除去してIDを生成
  const id = fileName.replace(/\.json$/i, '');

  return {
    id,
    name: sequence.name || id,
    fileName,
    scriptCount: sequence.scripts.length,
  };
}

/** Hook の返却状態 */
export interface AutoSenderState {
  /** 現在のステータス */
  status: AutoSenderStatus;
  /** 読み込んだシーケンス */
  sequence: ScriptSequence | null;
  /** 現在の送信インデックス（0始まり） */
  currentIndex: number;
  /** 送信間隔（秒） */
  interval: number;
  /** エラーメッセージ */
  error: string | null;
}

/** Hook の返却アクション */
export interface AutoSenderActions {
  /** シーケンスファイルを読み込む */
  loadSequence: (file: File) => Promise<void>;
  /** パース済みシーケンスデータを直接読み込む */
  loadSequenceFromData: (data: ScriptSequence) => void;
  /** 自動送信を開始 */
  start: () => void;
  /** 一時停止 */
  pause: () => void;
  /** 再開 */
  resume: () => void;
  /** 停止（リセット） */
  stop: () => void;
  /** 送信間隔を設定（秒、最小0） */
  setInterval: (seconds: number) => void;
  /** シーケンスをクリア */
  clearSequence: () => void;
}

/** シーケンスパース結果 */
export interface ParseSequenceResult {
  /** パースされたシーケンス（成功時） */
  sequence: ScriptSequence | null;
  /** エラーメッセージ（失敗時） */
  error: string | null;
}

/**
 * シーケンスファイルのJSONデータをパースしてバリデーションする
 * @param data - JSONパース済みのデータ
 * @returns パース結果（成功時はsequence、失敗時はerror）
 */
export function parseScriptSequence(data: unknown): ParseSequenceResult {
  if (!data || typeof data !== 'object') {
    return { sequence: null, error: '設定データはオブジェクトである必要があります' };
  }

  const config = data as Record<string, unknown>;

  // scriptsプロパティの存在チェック
  if (!('scripts' in config)) {
    return { sequence: null, error: 'scriptsプロパティが見つかりません' };
  }

  if (!Array.isArray(config.scripts)) {
    return { sequence: null, error: 'scripts は配列である必要があります' };
  }

  // 空配列チェック
  if (config.scripts.length === 0) {
    return { sequence: null, error: '台本が1件以上必要です' };
  }

  // 各台本のバリデーション
  const validScripts: Script[] = [];
  for (let i = 0; i < config.scripts.length; i++) {
    const errors = validateScript(config.scripts[i]);
    if (errors.length > 0) {
      return { sequence: null, error: `${i + 1}番目の台本: ${errors.join(', ')}` };
    }
    validScripts.push(config.scripts[i] as Script);
  }

  // nameのバリデーション（任意、あれば文字列）
  let name: string | undefined;
  if ('name' in config && config.name !== undefined) {
    if (typeof config.name !== 'string') {
      return { sequence: null, error: 'name は文字列である必要があります' };
    }
    name = config.name;
  }

  // defaultIntervalのバリデーション（任意、あれば数値）
  let defaultInterval: number | undefined;
  if ('defaultInterval' in config && config.defaultInterval !== undefined) {
    if (typeof config.defaultInterval !== 'number') {
      return { sequence: null, error: 'defaultInterval は数値である必要があります' };
    }
    defaultInterval = Math.max(0, config.defaultInterval);
  }

  return {
    sequence: {
      name,
      scripts: validScripts,
      defaultInterval,
    },
    error: null,
  };
}
