import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  parseScriptSequence,
  extractPresetInfo,
  PresetSequenceInfo,
  PresetSequencesResponse,
  ScriptSequence,
} from '@/lib/scriptTypes';

/** samplesフォルダのパス */
const SAMPLES_DIR = path.join(process.cwd(), 'samples');

/**
 * プリセット一覧を取得するAPI / 個別プリセットを取得するAPI
 * GET /api/preset-sequences - プリセット一覧を返す
 * GET /api/preset-sequences?id={id} - 指定したIDのシーケンスファイル内容を返す
 *
 * @returns { presets: PresetSequenceInfo[] } プリセット一覧
 * @returns ScriptSequence 個別シーケンス（id指定時）
 * @requirements 5.1, 5.2, 5.3, 5.4
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<PresetSequencesResponse | ScriptSequence | { error: string }>> {
  try {
    // クエリパラメータからIDを取得
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // IDが指定されている場合は個別取得
    if (id) {
      return getPresetById(id);
    }

    // IDがない場合は一覧取得
    return getPresetList();
  } catch (error) {
    console.error('[/api/preset-sequences] エラー:', error);
    return NextResponse.json({ presets: [] });
  }
}

/**
 * プリセット一覧を取得する内部関数
 */
function getPresetList(): NextResponse<PresetSequencesResponse> {
  // samplesフォルダの存在確認
  if (!fs.existsSync(SAMPLES_DIR)) {
    console.warn('[/api/preset-sequences] samplesフォルダが見つかりません:', SAMPLES_DIR);
    return NextResponse.json({ presets: [] });
  }

  // JSONファイルの一覧を取得
  const files = fs.readdirSync(SAMPLES_DIR);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    return NextResponse.json({ presets: [] });
  }

  // 各JSONファイルを読み込んでプリセット情報を抽出
  const presets: PresetSequenceInfo[] = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(SAMPLES_DIR, fileName);

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      const result = parseScriptSequence(data);

      if (result.error) {
        console.warn(`[/api/preset-sequences] ${fileName}: パースエラー - ${result.error}`);
        continue;
      }

      if (result.sequence) {
        const presetInfo = extractPresetInfo(fileName, result.sequence);
        presets.push(presetInfo);
      }
    } catch (error) {
      console.warn(`[/api/preset-sequences] ${fileName}: 読み込みエラー`, error);
      continue;
    }
  }

  return NextResponse.json({ presets });
}

/**
 * 指定されたIDのプリセットを取得する内部関数
 * @requirements 5.4
 */
function getPresetById(id: string): NextResponse<ScriptSequence | { error: string }> {
  const filePath = path.join(SAMPLES_DIR, `${id}.json`);

  // ファイルの存在確認
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `プリセット '${id}' が見つかりません` },
      { status: 404 }
    );
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    const result = parseScriptSequence(data);

    if (result.error) {
      console.error(`[/api/preset-sequences] ${id}: パースエラー - ${result.error}`);
      return NextResponse.json(
        { error: `シーケンスファイルのパースに失敗しました: ${result.error}` },
        { status: 500 }
      );
    }

    if (!result.sequence) {
      return NextResponse.json(
        { error: 'シーケンスデータが取得できませんでした' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.sequence);
  } catch (error) {
    console.error(`[/api/preset-sequences] ${id}: 読み込みエラー`, error);
    return NextResponse.json(
      { error: 'ファイルの読み込みに失敗しました' },
      { status: 500 }
    );
  }
}
