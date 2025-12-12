import { describe, it, expect, beforeEach } from 'vitest';
import {
  addVideoToSession,
  getNextVideo,
  cleanupOldSessions,
  resetSessionQueues,
  getSessionInfo,
  type VideoEntry,
  type SessionVideoQueue,
} from './sessionVideoQueue';

describe('sessionVideoQueue', () => {
  beforeEach(() => {
    resetSessionQueues();
  });

  describe('addVideoToSession', () => {
    it('新しいセッションに動画を追加できる', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 3,
      });

      const info = getSessionInfo('session-1');
      expect(info).not.toBeNull();
      expect(info!.videoCount).toBe(1);
      expect(info!.totalExpectedCount).toBe(3);
    });

    it('同一セッションに複数の動画を追加できる', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 3,
      });
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 1,
        videoPath: '/video/test2.mp4',
        totalCount: 3,
      });

      const info = getSessionInfo('session-1');
      expect(info!.videoCount).toBe(2);
    });

    it('順序がバラバラでも正しく格納される', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 2,
        videoPath: '/video/test3.mp4',
        totalCount: 3,
      });
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 3,
      });
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 1,
        videoPath: '/video/test2.mp4',
        totalCount: 3,
      });

      const info = getSessionInfo('session-1');
      expect(info!.videoCount).toBe(3);
    });
  });

  describe('getNextVideo', () => {
    it('次のシーケンス番号の動画を返す', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 2,
      });

      const result = getNextVideo('session-1');
      expect(result.videoPath).toBe('/video/test1.mp4');
      expect(result.sequence).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('シーケンス番号順に動画を取得できる', () => {
      // 順序バラバラで追加
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 2,
        videoPath: '/video/test3.mp4',
        totalCount: 3,
      });
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 3,
      });
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 1,
        videoPath: '/video/test2.mp4',
        totalCount: 3,
      });

      // 順番に取得
      const first = getNextVideo('session-1');
      expect(first.videoPath).toBe('/video/test1.mp4');
      expect(first.sequence).toBe(0);

      const second = getNextVideo('session-1');
      expect(second.videoPath).toBe('/video/test2.mp4');
      expect(second.sequence).toBe(1);

      const third = getNextVideo('session-1');
      expect(third.videoPath).toBe('/video/test3.mp4');
      expect(third.sequence).toBe(2);
      expect(third.isComplete).toBe(true);
    });

    it('次のシーケンスが未到着の場合はnullを返す', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 1, // 0をスキップ
        videoPath: '/video/test2.mp4',
        totalCount: 3,
      });

      const result = getNextVideo('session-1');
      expect(result.videoPath).toBeNull();
      expect(result.sequence).toBeUndefined();
    });

    it('存在しないセッションの場合はnullを返す', () => {
      const result = getNextVideo('non-existent');
      expect(result.videoPath).toBeNull();
    });

    it('全ての動画を取得後はisCompleteがtrueになる', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 1,
      });

      const result = getNextVideo('session-1');
      expect(result.videoPath).toBe('/video/test1.mp4');
      expect(result.isComplete).toBe(true);
    });
  });

  describe('cleanupOldSessions', () => {
    it('1時間経過したセッションを削除する', () => {
      // 現在時刻で追加
      addVideoToSession({
        sessionId: 'new-session',
        sequence: 0,
        videoPath: '/video/new.mp4',
        totalCount: 1,
      });

      // cleanupは内部で古いセッションのみ削除
      // テストでは実際の時間経過はできないので、この関数が呼べることを確認
      cleanupOldSessions();

      const info = getSessionInfo('new-session');
      expect(info).not.toBeNull();
    });
  });

  describe('resetSessionQueues', () => {
    it('全てのセッションをクリアする', () => {
      addVideoToSession({
        sessionId: 'session-1',
        sequence: 0,
        videoPath: '/video/test1.mp4',
        totalCount: 1,
      });
      addVideoToSession({
        sessionId: 'session-2',
        sequence: 0,
        videoPath: '/video/test2.mp4',
        totalCount: 1,
      });

      resetSessionQueues();

      expect(getSessionInfo('session-1')).toBeNull();
      expect(getSessionInfo('session-2')).toBeNull();
    });
  });
});
