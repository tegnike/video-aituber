import { NextResponse } from 'next/server';
import { getControlButtonsConfig, getScreenModesConfig, getLoopActions } from '@/lib/videoGenerationConfig';

export async function GET() {
  const controlButtons = getControlButtonsConfig();
  const screenModes = getScreenModesConfig();
  const loopActions = getLoopActions();
  return NextResponse.json({
    controlButtons: controlButtons ?? {},
    screenModes: screenModes ?? {},
    loopActions,
  });
}
