/**
 * コマンドキュー - FIFOでコマンドを管理
 * @see .kiro/specs/reliable-remote-control/design.md - CommandQueue
 * Requirements: 1.3, 1.4, 2.1, 2.3, 2.4
 */
import type { RemoteCommand } from './remoteState';

const MAX_QUEUE_SIZE = 100;
const commandQueue: RemoteCommand[] = [];

/**
 * コマンドをキューに追加（エンキュー）
 * 上限100件を超えた場合は古いコマンドから削除
 */
export const enqueueCommand = (command: RemoteCommand): void => {
  commandQueue.push(command);

  // 上限を超えた場合は古いものから削除
  while (commandQueue.length > MAX_QUEUE_SIZE) {
    commandQueue.shift();
  }
};

/**
 * キュー内の全コマンドを取得して削除（デキュー）
 * FIFO順序を保証
 */
export const dequeueAllCommands = (): RemoteCommand[] => {
  const commands = [...commandQueue];
  commandQueue.length = 0;
  return commands;
};

/**
 * キュー内のコマンド数を取得
 */
export const getCommandQueueLength = (): number => {
  return commandQueue.length;
};

/**
 * キューをクリア（テスト用）
 */
export const clearCommandQueue = (): void => {
  commandQueue.length = 0;
};
