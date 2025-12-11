/**
 * リモート操作パネル用の共有状態管理
 * @see .kiro/specs/remote-control-panel/design.md - Data Models
 */

export interface AppState {
  hasStarted: boolean;
  screenMode: 'standby' | 'room' | null;
  isLoadingBackground: boolean;
  isLoadingControlVideo: boolean;
  controlVideoType: 'start' | 'end' | null;
  oneCommeEnabled: boolean;
  oneCommeConnected: boolean;
  isScriptSending: boolean;
  uiVisibility: {
    controls: boolean;
    chatHistory: boolean;
    chatInput: boolean;
  };
}

const initialState: AppState = {
  hasStarted: false,
  screenMode: null,
  isLoadingBackground: false,
  isLoadingControlVideo: false,
  controlVideoType: null,
  oneCommeEnabled: false,
  oneCommeConnected: false,
  isScriptSending: false,
  uiVisibility: {
    controls: true,
    chatHistory: true,
    chatInput: true,
  },
};

let appState: AppState = { ...initialState, uiVisibility: { ...initialState.uiVisibility } };

type Subscriber = (state: AppState) => void;
const subscribers: Set<Subscriber> = new Set();

export const getAppState = (): AppState => {
  return { ...appState, uiVisibility: { ...appState.uiVisibility } };
};

export const updateAppState = (partial: Partial<AppState>): void => {
  appState = {
    ...appState,
    ...partial,
    uiVisibility: partial.uiVisibility
      ? { ...partial.uiVisibility }
      : { ...appState.uiVisibility },
  };

  subscribers.forEach((subscriber) => {
    subscriber(getAppState());
  });
};

export const resetAppState = (): void => {
  appState = { ...initialState, uiVisibility: { ...initialState.uiVisibility } };
};

export const subscribe = (subscriber: Subscriber): (() => void) => {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

// コマンド型定義
import type { Script } from '@/lib/scriptTypes';

export type RemoteCommand =
  | { type: 'selectMode'; mode: 'standby' | 'room' }
  | { type: 'controlVideo'; action: 'start' | 'end' }
  | { type: 'sendScript'; script: Script }
  | { type: 'toggleOneComme'; enabled: boolean }
  | { type: 'setUIVisibility'; target: 'controls' | 'chatHistory' | 'chatInput'; visible: boolean };
