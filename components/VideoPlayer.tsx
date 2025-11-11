'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface VideoPlayerProps {
  loopVideoPath: string;
  generatedVideoPath?: string | null;
  onVideoEnd?: () => void;
  enableAudioOnInteraction?: boolean;
}

export default function VideoPlayer({
  loopVideoPath,
  generatedVideoPath,
  onVideoEnd,
  enableAudioOnInteraction = true,
}: VideoPlayerProps) {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<1 | 2>(1);
  const [video1Src, setVideo1Src] = useState<string>(loopVideoPath);
  const [video2Src, setVideo2Src] = useState<string>(loopVideoPath);
  const [video1Opacity, setVideo1Opacity] = useState<number>(1);
  const [video2Opacity, setVideo2Opacity] = useState<number>(0);
  const [isGeneratedVideo, setIsGeneratedVideo] = useState(false);
  const [pendingGeneratedVideo, setPendingGeneratedVideo] = useState<
    string | null
  >(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // 初期化: 両方のvideo要素をループ動画で設定
  useEffect(() => {
    if (video1Ref.current) {
      video1Ref.current.src = loopVideoPath;
    }
    if (video2Ref.current) {
      video2Ref.current.src = loopVideoPath;
    }
  }, [loopVideoPath]);

  // 音声状態が変更されたときに、両方のvideo要素の音声状態を更新
  useEffect(() => {
    if (video1Ref.current) {
      video1Ref.current.muted = !isAudioEnabled;
    }
    if (video2Ref.current) {
      video2Ref.current.muted = !isAudioEnabled;
    }
  }, [isAudioEnabled]);

  // 生成動画が準備できた場合、pendingに設定し、事前に読み込む
  useEffect(() => {
    if (!generatedVideoPath || isGeneratedVideo || pendingGeneratedVideo) {
      return;
    }

    // 次の動画を事前に読み込む（暗転を防ぐため）
    const nextVideoRef = activeVideo === 1 ? video2Ref : video1Ref;
    const nextVideo = nextVideoRef.current;
    if (nextVideo) {
      nextVideo.src = generatedVideoPath;
      nextVideo.muted = !isAudioEnabled;
      nextVideo.preload = 'auto';
      nextVideo.load();
    }

    // 状態を更新（次のレンダリングサイクルで）
    const timer = setTimeout(() => {
      setPendingGeneratedVideo(generatedVideoPath);
    }, 0);

    return () => clearTimeout(timer);
  }, [generatedVideoPath, isGeneratedVideo, pendingGeneratedVideo, activeVideo, isAudioEnabled]);

  // 動画をスムーズに切り替える関数
  const switchVideo = useCallback(
    (newSrc: string, isGenerated: boolean) => {
      const currentVideoRef = activeVideo === 1 ? video1Ref : video2Ref;
      const nextVideoRef = activeVideo === 1 ? video2Ref : video1Ref;
      const currentOpacitySetter =
        activeVideo === 1 ? setVideo1Opacity : setVideo2Opacity;
      const nextOpacitySetter =
        activeVideo === 1 ? setVideo2Opacity : setVideo1Opacity;
      const nextSrcSetter = activeVideo === 1 ? setVideo2Src : setVideo1Src;

      const nextVideo = nextVideoRef.current;
      const currentVideo = currentVideoRef.current;
      if (!nextVideo || !currentVideo) return;

      // 次の動画のsrcを更新
      nextSrcSetter(newSrc);
      nextVideo.muted = !isAudioEnabled;
      nextVideo.currentTime = 0;

      // 次の動画が既に読み込まれている場合は、即座に切り替え
      if (nextVideo.readyState >= 3) {
        // HAVE_FUTURE_DATA以上（十分に読み込まれている）
        // フェードなしで即座に切り替え
        currentOpacitySetter(0);
        nextOpacitySetter(1);
        currentVideo.pause();
        currentVideo.currentTime = 0;
        nextVideo.play().catch((error) => {
          console.error('Error playing next video:', error);
        });
        setActiveVideo(activeVideo === 1 ? 2 : 1);
        setIsGeneratedVideo(isGenerated);
        return;
      }

      // 次の動画が読み込まれるのを待つ
      const handleCanPlay = () => {
        nextVideo.removeEventListener('canplay', handleCanPlay);
        nextVideo.removeEventListener('loadeddata', handleCanPlay);
        nextVideo.removeEventListener('canplaythrough', handleCanPlay);

        // フェードなしで即座に切り替え
        currentOpacitySetter(0);
        nextOpacitySetter(1);
        currentVideo.pause();
        currentVideo.currentTime = 0;
        nextVideo.play().catch((error) => {
          console.error('Error playing next video:', error);
        });
        setActiveVideo(activeVideo === 1 ? 2 : 1);
        setIsGeneratedVideo(isGenerated);
      };

      // 複数のイベントを監視（より早く検知できる場合がある）
      nextVideo.addEventListener('canplaythrough', handleCanPlay);
      nextVideo.addEventListener('canplay', handleCanPlay);
      nextVideo.addEventListener('loadeddata', handleCanPlay);
      
      // 既に読み込まれている場合は、srcを設定するだけ
      if (nextVideo.src !== newSrc) {
        nextVideo.src = newSrc;
        nextVideo.load();
      } else if (nextVideo.readyState >= 2) {
        // 既に読み込まれている場合は、すぐに切り替え
        handleCanPlay();
      }
    },
    [activeVideo, isAudioEnabled]
  );

  // 動画終了イベントの処理
  useEffect(() => {
    const currentVideoRef = activeVideo === 1 ? video1Ref : video2Ref;
    const video = currentVideoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (isGeneratedVideo) {
        // 生成動画が終了したら、ループ動画に戻る
        switchVideo(loopVideoPath, false);
        setPendingGeneratedVideo(null);
        onVideoEnd?.();
      } else {
        // ループ動画が終了したら、pendingの生成動画があるかチェック
        if (pendingGeneratedVideo) {
          switchVideo(pendingGeneratedVideo, true);
          setPendingGeneratedVideo(null);
        } else {
          // 生成動画がなければ、ループ動画を再開
          video.play().catch((error) => {
            console.error('Error replaying video:', error);
          });
        }
      }
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [
    activeVideo,
    isGeneratedVideo,
    pendingGeneratedVideo,
    loopVideoPath,
    onVideoEnd,
    switchVideo,
  ]);

  // ユーザーインタラクションで音声を有効にする
  useEffect(() => {
    if (!enableAudioOnInteraction || isAudioEnabled) return;

    const handleUserInteraction = () => {
      setIsAudioEnabled(true);
    };

    // ページ上の任意のクリック、キー入力、タッチで音声を有効化
    const options = { once: true, passive: true };
    document.addEventListener('click', handleUserInteraction, options);
    document.addEventListener('keydown', handleUserInteraction, options);
    document.addEventListener('touchstart', handleUserInteraction, options);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [enableAudioOnInteraction, isAudioEnabled]);

  // エラーハンドリング
  useEffect(() => {
    const handleError1 = (e: Event) => {
      console.error('Error loading video1:', e);
      const video = video1Ref.current;
      if (!video) return;

      // ループ動画の読み込みエラーの場合は、再試行
      if (video.src.includes(loopVideoPath) && !isGeneratedVideo) {
        setTimeout(() => {
          video.load();
        }, 1000);
      }
    };

    const handleError2 = (e: Event) => {
      console.error('Error loading video2:', e);
      const video = video2Ref.current;
      if (!video) return;

      // ループ動画の読み込みエラーの場合は、再試行
      if (video.src.includes(loopVideoPath) && !isGeneratedVideo) {
        setTimeout(() => {
          video.load();
        }, 1000);
      }
    };

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (video1) {
      video1.addEventListener('error', handleError1);
    }
    if (video2) {
      video2.addEventListener('error', handleError2);
    }

    return () => {
      if (video1) {
        video1.removeEventListener('error', handleError1);
      }
      if (video2) {
        video2.removeEventListener('error', handleError2);
      }
    };
  }, [loopVideoPath, isGeneratedVideo]);

  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <video
        ref={video1Ref}
        src={video1Src}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ opacity: video1Opacity, zIndex: activeVideo === 1 ? 1 : 0 }}
        autoPlay
        muted={!isAudioEnabled}
        playsInline
        loop={false}
        preload="auto"
      />
      <video
        ref={video2Ref}
        src={video2Src}
        className="fixed inset-0 w-full h-full object-cover"
        style={{ opacity: video2Opacity, zIndex: activeVideo === 2 ? 1 : 0 }}
        autoPlay={false}
        muted={!isAudioEnabled}
        playsInline
        loop={false}
        preload="auto"
      />
    </div>
  );
}

