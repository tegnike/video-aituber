/**
 * /api/remote/commands エンドポイントのテスト
 * @see .kiro/specs/reliable-remote-control/design.md - /api/remote/commands
 * Requirements: 1.1, 1.4, 2.2, 2.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { enqueueCommand, clearCommandQueue } from '@/lib/commandQueue';

describe('GET /api/remote/commands', () => {
  beforeEach(() => {
    clearCommandQueue();
  });

  it('should return empty array when queue is empty', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.commands).toEqual([]);
  });

  it('should return all commands and clear queue', async () => {
    enqueueCommand({ type: 'selectMode', mode: 'standby' });
    enqueueCommand({ type: 'controlVideo', action: 'start' });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.commands).toHaveLength(2);
    expect(data.commands[0]).toEqual({ type: 'selectMode', mode: 'standby' });
    expect(data.commands[1]).toEqual({ type: 'controlVideo', action: 'start' });

    // Queue should be cleared after GET
    const response2 = await GET();
    const data2 = await response2.json();
    expect(data2.commands).toEqual([]);
  });

  it('should preserve FIFO order', async () => {
    enqueueCommand({ type: 'selectMode', mode: 'standby' });
    enqueueCommand({ type: 'controlVideo', action: 'start' });
    enqueueCommand({ type: 'toggleOneComme', enabled: true });

    const response = await GET();
    const data = await response.json();

    expect(data.commands[0].type).toBe('selectMode');
    expect(data.commands[1].type).toBe('controlVideo');
    expect(data.commands[2].type).toBe('toggleOneComme');
  });
});
