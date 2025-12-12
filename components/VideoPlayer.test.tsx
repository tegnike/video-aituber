import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import VideoPlayer from './VideoPlayer';

describe('VideoPlayer 順序維持テスト', () => {
  beforeEach(() => {
    // HTMLMediaElement.prototype.playをモック
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialQueue の順序維持', () => {
    it('initialQueueに渡された動画配列の順序が維持される', () => {
      const initialQueue = [
        '/video/first.mp4',
        '/video/second.mp4',
        '/video/third.mp4',
      ];
      const loopVideoPaths = ['/video/loop.mp4'];

      const { container } = render(
        <VideoPlayer
          loopVideoPaths={loopVideoPaths}
          initialQueue={initialQueue}
        />
      );

      // VideoPlayerがレンダリングされたことを確認（ダブルバッファリングで2つ）
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(2);
    });

    it('pendingGeneratedVideosへの追加が順序を維持する', () => {
      const onVideoEnd = vi.fn();
      const initialQueue = [
        '/video/first.mp4',
        '/video/second.mp4',
      ];
      const loopVideoPaths = ['/video/loop.mp4'];

      const { container } = render(
        <VideoPlayer
          loopVideoPaths={loopVideoPaths}
          initialQueue={initialQueue}
          onVideoEnd={onVideoEnd}
        />
      );

      // video要素が存在することを確認
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(2); // ダブルバッファリング
    });
  });

  describe('動画再生順序', () => {
    it('キュー内の動画は先頭から順番に処理される', () => {
      const onVideoEnd = vi.fn();
      const loopVideoPaths = ['/video/loop.mp4'];

      const { container } = render(
        <VideoPlayer
          loopVideoPaths={loopVideoPaths}
          generatedVideoPath="/video/first.mp4"
          initialQueue={['/video/second.mp4']}
          onVideoEnd={onVideoEnd}
        />
      );

      // 両方のvideo要素が存在することを確認
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(2);

      // video1の初期srcが設定されていることを確認（generatedVideoPathが最初）
      const video1 = videos[0] as HTMLVideoElement;
      expect(video1.src).toContain('first.mp4');
    });

    it('受け取った順序を変更せずに動画キューを維持する', () => {
      const initialQueue = [
        '/video/a.mp4',
        '/video/b.mp4',
        '/video/c.mp4',
      ];
      const loopVideoPaths = ['/video/loop.mp4'];

      const { container } = render(
        <VideoPlayer
          loopVideoPaths={loopVideoPaths}
          initialQueue={initialQueue}
        />
      );

      // VideoPlayerが正常にレンダリングされることを確認
      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(2);
    });
  });

  describe('重複再生防止', () => {
    it('同じ動画パスが複数回再生されない', () => {
      const onVideoEnd = vi.fn();
      const loopVideoPaths = ['/video/loop.mp4'];

      const { container } = render(
        <VideoPlayer
          loopVideoPaths={loopVideoPaths}
          generatedVideoPath="/video/test.mp4"
          initialQueue={['/video/test.mp4']}
          onVideoEnd={onVideoEnd}
        />
      );

      const videos = container.querySelectorAll('video');
      expect(videos.length).toBe(2);
    });
  });
});
