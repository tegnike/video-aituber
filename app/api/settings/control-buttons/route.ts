import { NextResponse } from 'next/server';
import { getControlButtonsConfig, getScreenModesConfig } from '@/lib/videoGenerationConfig';

export async function GET() {
  const controlButtons = getControlButtonsConfig();
  const screenModes = getScreenModesConfig();
  return NextResponse.json({
    controlButtons: controlButtons ?? {},
    screenModes: screenModes ?? {},
  });
}
