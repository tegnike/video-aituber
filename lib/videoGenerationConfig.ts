import fs from 'fs';
import path from 'path';

export interface ActionParams {
  [key: string]: unknown;
}

export interface ActionConfig {
  params: ActionParams;
}

export interface StartupRequest {
  action: string;
  params: Record<string, unknown>;
}

export interface StartupConfig {
  enabled: boolean;
  requests: StartupRequest[];
}

export interface ControlButtonConfig {
  action: string;
  afterAction: string;
}

export interface ControlButtonsConfig {
  start?: ControlButtonConfig;
  end?: ControlButtonConfig;
}

export interface VideoGenerationConfig {
  presetId: string;
  actions: Record<string, ActionConfig>;
  emotions: string[];
  idleDurationRange: {
    min: number;
    max: number;
  };
  startup?: StartupConfig;
  controlButtons?: ControlButtonsConfig;
}

let cachedConfig: VideoGenerationConfig | null = null;

export function getVideoGenerationConfig(): VideoGenerationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'config', 'video-generation.json');

  try {
    const configFile = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configFile) as VideoGenerationConfig;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load video generation config:', error);
    // デフォルト設定を返す
    return {
      presetId: 'character',
      actions: {
        loop: { params: {} },
        speak: { params: { text: '', emotion: 'neutral' } },
        idle: { params: { durationMs: 2000 } },
      },
      emotions: ['neutral', 'thinking'],
      idleDurationRange: { min: 2000, max: 3000 },
    };
  }
}

export function getPresetId(): string {
  return getVideoGenerationConfig().presetId;
}

export function getAvailableActions(): string[] {
  return Object.keys(getVideoGenerationConfig().actions);
}

export function getEmotions(): string[] {
  return getVideoGenerationConfig().emotions;
}

export function getIdleDurationRange(): { min: number; max: number } {
  return getVideoGenerationConfig().idleDurationRange;
}

export function getStartupConfig(): StartupConfig | null {
  const config = getVideoGenerationConfig();
  return config.startup?.enabled ? config.startup : null;
}

export function getControlButtonsConfig(): ControlButtonsConfig | null {
  const config = getVideoGenerationConfig();
  return config.controlButtons ?? null;
}

export function getControlButtonConfig(buttonType: 'start' | 'end'): ControlButtonConfig | null {
  const config = getVideoGenerationConfig();
  return config.controlButtons?.[buttonType] ?? null;
}
