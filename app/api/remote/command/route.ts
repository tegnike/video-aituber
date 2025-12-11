import { NextResponse } from 'next/server';
import { updateAppState, getAppState, RemoteCommand } from '@/lib/remoteState';
import { enqueueCommand } from '@/lib/commandQueue';

function isValidCommand(cmd: unknown): cmd is RemoteCommand {
  if (!cmd || typeof cmd !== 'object') return false;
  const c = cmd as Record<string, unknown>;

  switch (c.type) {
    case 'selectMode':
      return c.mode === 'standby' || c.mode === 'room';
    case 'controlVideo':
      return c.action === 'start' || c.action === 'end';
    case 'sendScript':
      // scriptオブジェクトが存在し、idとtextを持っているか確認
      return c.script != null && typeof (c.script as Record<string, unknown>).id === 'string' && typeof (c.script as Record<string, unknown>).text === 'string';
    case 'toggleOneComme':
      return typeof c.enabled === 'boolean';
    case 'setUIVisibility':
      return (
        (c.target === 'controls' || c.target === 'chatHistory' || c.target === 'chatInput') &&
        typeof c.visible === 'boolean'
      );
    default:
      return false;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidCommand(body)) {
    return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  }

  const command = body;

  switch (command.type) {
    case 'selectMode':
      updateAppState({ screenMode: command.mode, hasStarted: true });
      break;
    case 'controlVideo':
      updateAppState({ controlVideoType: command.action });
      break;
    case 'sendScript':
      updateAppState({ isScriptSending: true });
      break;
    case 'toggleOneComme':
      updateAppState({ oneCommeEnabled: command.enabled });
      break;
    case 'setUIVisibility': {
      const currentState = getAppState();
      updateAppState({
        uiVisibility: {
          ...currentState.uiVisibility,
          [command.target]: command.visible,
        },
      });
      break;
    }
  }

  // コマンドキューに追加（ポーリングで取得される）
  enqueueCommand(command);

  return NextResponse.json({ success: true, command });
}
