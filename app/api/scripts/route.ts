import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseScriptsConfig, Script } from '@/lib/scriptTypes';

/**
 * 台本一覧を取得するAPI
 * GET /api/scripts
 *
 * @returns { scripts: Script[] } 台本データの配列
 * @requirements 5.1, 5.3
 */
export async function GET(): Promise<NextResponse<{ scripts: Script[] }>> {
  const configPath = path.join(process.cwd(), 'config', 'scripts.json');

  try {
    if (!fs.existsSync(configPath)) {
      // ファイル不在時は空配列を返却
      console.warn('[/api/scripts] 設定ファイルが見つかりません:', configPath);
      return NextResponse.json({ scripts: [] });
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const { scripts, errors } = parseScriptsConfig(data);

    // パースエラーがあればログ出力（アプリは継続動作）
    if (errors.length > 0) {
      console.warn('[/api/scripts] 一部の台本データにエラーがあります:', errors);
    }

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('[/api/scripts] 設定ファイルの読み込みに失敗しました:', error);
    // エラー時も空配列を返却してアプリを継続動作させる
    return NextResponse.json({ scripts: [] });
  }
}
