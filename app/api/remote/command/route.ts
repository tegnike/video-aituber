import { NextResponse } from 'next/server';
import { updateAppState, getAppState, broadcastCommand } from '@/lib/remoteState';

type RemoteCommand =
  | { type: 'selectMode'; mode: 'standby' | 'room' }
  | { type: 'controlVideo'; action: 'start' | 'end' }
  | { type: 'sendScript'; scriptId: string }
  | { type: 'toggleOneComme'; enabled: boolean }
  | { type: 'setUIVisibility'; target: 'controls' | 'chatHistory' | 'chatInput'; visible: boolean };

function isValidCommand(cmd: unknown): cmd is RemoteCommand {
  if (!cmd || typeof cmd !== 'object') return false;
  const c = cmd as Record<string, unknown>;

  switch (c.type) {
    case 'selectMode':
      return c.mode === 'standby' || c.mode === 'room';
    case 'controlVideo':
      return c.action === 'start' || c.action === 'end';
    case 'sendScript':
      return typeof c.scriptId === 'string';
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

  // SSE購読者にコマンドを配信
  broadcastCommand(command);

  return NextResponse.json({ success: true, command });
}
