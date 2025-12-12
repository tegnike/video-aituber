import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { resetSessionQueues } from '@/lib/sessionVideoQueue';
import { resetLegacyQueue } from '@/lib/legacyVideoQueue';

// モックリクエストを作成するヘルパー
function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/generate-video-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/generate-video-callback');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('generate-video-callback API', () => {
  beforeEach(() => {
    resetSessionQueues();
    resetLegacyQueue();
  });

  describe('POST - 従来の動作（後方互換性）', () => {
    it('videoPathがない場合は400エラーを返す', async () => {
      const req = createPostRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Video path is required');
    });

    it('sessionIdなしでも動画を登録できる', async () => {
      const req = createPostRequest({ videoPath: '/tmp/video.mp4' });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });
  });

  describe('POST - セッション対応', () => {
    it('sessionId付きで動画を登録できる', async () => {
      const req = createPostRequest({
        videoPath: '/tmp/video.mp4',
        sessionId: 'test-session-1',
        sequence: 0,
        totalCount: 3,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('同一セッションに複数の動画を登録できる', async () => {
      for (let i = 0; i < 3; i++) {
        const req = createPostRequest({
          videoPath: `/tmp/video${i}.mp4`,
          sessionId: 'test-session-1',
          sequence: i,
          totalCount: 3,
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('GET - 従来の動作（後方互換性）', () => {
    it('キューが空の場合はnullを返す', async () => {
      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.videoPath).toBeNull();
    });

    it('sessionIdなしのPOSTで登録した動画を取得できる', async () => {
      // 登録
      const postReq = createPostRequest({ videoPath: '/tmp/video.mp4' });
      await POST(postReq);

      // 取得
      const getReq = createGetRequest();
      const res = await GET(getReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.videoPath).toContain('video.mp4');
    });
  });

  describe('GET - セッション対応', () => {
    it('sessionId指定で次のシーケンスの動画を取得できる', async () => {
      // 登録
      const postReq = createPostRequest({
        videoPath: '/tmp/video0.mp4',
        sessionId: 'test-session-1',
        sequence: 0,
        totalCount: 1,
      });
      await POST(postReq);

      // 取得
      const getReq = createGetRequest({ sessionId: 'test-session-1' });
      const res = await GET(getReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.videoPath).toContain('video0.mp4');
      expect(data.sequence).toBe(0);
      expect(data.isComplete).toBe(true);
    });

    it('シーケンス順に動画を取得できる', async () => {
      // 順序バラバラで登録
      await POST(createPostRequest({
        videoPath: '/tmp/video2.mp4',
        sessionId: 'test-session-1',
        sequence: 2,
        totalCount: 3,
      }));
      await POST(createPostRequest({
        videoPath: '/tmp/video0.mp4',
        sessionId: 'test-session-1',
        sequence: 0,
        totalCount: 3,
      }));
      await POST(createPostRequest({
        videoPath: '/tmp/video1.mp4',
        sessionId: 'test-session-1',
        sequence: 1,
        totalCount: 3,
      }));

      // 順番に取得
      let res = await GET(createGetRequest({ sessionId: 'test-session-1' }));
      let data = await res.json();
      expect(data.videoPath).toContain('video0.mp4');
      expect(data.sequence).toBe(0);
      expect(data.isComplete).toBe(false);

      res = await GET(createGetRequest({ sessionId: 'test-session-1' }));
      data = await res.json();
      expect(data.videoPath).toContain('video1.mp4');
      expect(data.sequence).toBe(1);
      expect(data.isComplete).toBe(false);

      res = await GET(createGetRequest({ sessionId: 'test-session-1' }));
      data = await res.json();
      expect(data.videoPath).toContain('video2.mp4');
      expect(data.sequence).toBe(2);
      expect(data.isComplete).toBe(true);
    });

    it('次のシーケンスが未到着の場合はnullを返す', async () => {
      // sequence 1のみ登録（0をスキップ）
      await POST(createPostRequest({
        videoPath: '/tmp/video1.mp4',
        sessionId: 'test-session-1',
        sequence: 1,
        totalCount: 3,
      }));

      const res = await GET(createGetRequest({ sessionId: 'test-session-1' }));
      const data = await res.json();
      expect(data.videoPath).toBeNull();
    });

    it('存在しないセッションの場合はnullを返す', async () => {
      const res = await GET(createGetRequest({ sessionId: 'non-existent' }));
      const data = await res.json();
      expect(data.videoPath).toBeNull();
    });
  });
});
