import { NextResponse } from 'next/server';
import { getAppState, updateAppState, type AppState } from '@/lib/remoteState';

export async function GET() {
  const state = getAppState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<AppState>;
    updateAppState(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
