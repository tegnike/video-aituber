/**
 * コマンド取得エンドポイント
 * @see .kiro/specs/reliable-remote-control/design.md - /api/remote/commands
 * Requirements: 1.1, 1.4, 2.2, 2.3
 */
import { NextResponse } from 'next/server';
import { dequeueAllCommands } from '@/lib/commandQueue';

/**
 * GET /api/remote/commands
 * キュー内の全コマンドを取得して削除（アトミック処理）
 */
export async function GET() {
  const commands = dequeueAllCommands();
  return NextResponse.json({ commands });
}
