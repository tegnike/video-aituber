import { NextResponse } from 'next/server';
import { getControlButtonsConfig } from '@/lib/videoGenerationConfig';

export async function GET() {
  const config = getControlButtonsConfig();
  return NextResponse.json(config ?? {});
}
