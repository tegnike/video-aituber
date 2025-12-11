/**
 * コマンドキューのユニットテスト
 * @see .kiro/specs/reliable-remote-control/design.md - CommandQueue
 * Requirements: 1.3, 1.4, 2.1, 2.3, 2.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueCommand,
  dequeueAllCommands,
  getCommandQueueLength,
  clearCommandQueue,
} from '../commandQueue';
import type { RemoteCommand } from '../remoteState';

describe('CommandQueue', () => {
  beforeEach(() => {
    clearCommandQueue();
  });

  describe('enqueueCommand', () => {
    it('should add a command to the queue', () => {
      const command: RemoteCommand = { type: 'selectMode', mode: 'standby' };
      enqueueCommand(command);
      expect(getCommandQueueLength()).toBe(1);
    });

    it('should add multiple commands to the queue', () => {
      enqueueCommand({ type: 'selectMode', mode: 'standby' });
      enqueueCommand({ type: 'controlVideo', action: 'start' });
      expect(getCommandQueueLength()).toBe(2);
    });
  });

  describe('dequeueAllCommands', () => {
    it('should return all commands and clear the queue', () => {
      enqueueCommand({ type: 'selectMode', mode: 'standby' });
      enqueueCommand({ type: 'controlVideo', action: 'start' });

      const commands = dequeueAllCommands();
      expect(commands).toHaveLength(2);
      expect(getCommandQueueLength()).toBe(0);
    });

    it('should return empty array when queue is empty', () => {
      const commands = dequeueAllCommands();
      expect(commands).toEqual([]);
    });

    it('should preserve FIFO order', () => {
      enqueueCommand({ type: 'selectMode', mode: 'standby' });
      enqueueCommand({ type: 'controlVideo', action: 'start' });
      enqueueCommand({ type: 'toggleOneComme', enabled: true });

      const commands = dequeueAllCommands();
      expect(commands[0]).toEqual({ type: 'selectMode', mode: 'standby' });
      expect(commands[1]).toEqual({ type: 'controlVideo', action: 'start' });
      expect(commands[2]).toEqual({ type: 'toggleOneComme', enabled: true });
    });
  });

  describe('queue limit', () => {
    it('should remove oldest commands when exceeding 100 items', () => {
      // Add 105 commands
      for (let i = 0; i < 105; i++) {
        enqueueCommand({ type: 'selectMode', mode: i % 2 === 0 ? 'standby' : 'room' });
      }

      expect(getCommandQueueLength()).toBe(100);

      // First command should be the 6th one added (index 5)
      const commands = dequeueAllCommands();
      expect(commands[0]).toEqual({ type: 'selectMode', mode: 'room' }); // index 5 is odd -> room
    });
  });
});
