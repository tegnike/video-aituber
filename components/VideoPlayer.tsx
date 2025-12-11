'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

interface VideoPlayerProps {
  loopVideoPaths: string[];
  generatedVideoPath?: string | null;
  initialQueue?: string[];
  afterQueueVideoPaths?: string[];
  onVideoEnd?: (finishedVideoPath: string | null) => void;
  enableAudioOnInteraction?: boolean;
}

// ランダムにloop動画を選択（連続再生防止）
const getRandomLoopVideo = (
  loopVideoPaths: string[],
  lastPlayedPath: string | null
): string => {
  if (loopVideoPaths.length === 0) {
    return '';
  }
  if (loopVideoPaths.length === 1) {
    return loopVideoPaths[0];
  }
  // 2つ以上の場合、前回と違う動画をランダムに選択
  let nextPath: string;
  do {
    nextPath = loopVideoPaths[Math.floor(Math.random() * loopVideoPaths.length)];
  } while (nextPath === lastPlayedPath);
  return nextPath;
};

export default function VideoPlayer({
  loopVideoPaths,
  generatedVideoPath,
  initialQueue,
  afterQueueVideoPaths = [],
  onVideoEnd,
  enableAudioOnInteraction = true,
}: VideoPlayerProps) {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const previousLoopVideoPathsRef = useRef<string[]>(loopVideoPaths);
  const lastPlayedLoopVideoRef = useRef<string | null>(null);
  const processedVideoPathsRef = useRef<Set<string>>(
    new Set(generatedVideoPath ? [generatedVideoPath, ...(initialQueue || [])] : [])
  );
  const hasInitialPlayStartedRef = useRef(false);
  const [activeVideo, setActiveVideo] = useState<1 | 2>(1);
  // 初期動画がある場合はそれを使用、なければループ動画
  const initialLoopVideo = loopVideoPaths[0] || '';
  const [video1Src, setVideo1Src] = useState<string>(generatedVideoPath || initialLoopVideo);
  const [video2Src, setVideo2Src] = useState<string>(initialLoopVideo);
  const [currentLoopVideoPath, setCurrentLoopVideoPath] = useState<string>(initialLoopVideo);
  const [video1Opacity, setVideo1Opacity] = useState<number>(1);
  const [video2Opacity, setVideo2Opacity] = useState<number>(0);
  const [isGeneratedVideo, setIsGeneratedVideo] = useState(!!generatedVideoPath);
  const [pendingGeneratedVideos, setPendingGeneratedVideos] = useState<
    string[]
  >(initialQueue || []);
  const [isAudioEnabled, setIsAudioEnabled] = useState(!enableAudioOnInteraction);

  // 初回マウント時に動画を明示的に再生開始
  useEffect(() => {
    if (hasInitialPlayStartedRef.current) return;
    hasInitialPlayStartedRef.current = true;

    const video = video1Ref.current;
    if (video) {
      video.play().catch((error) => {
        console.error('Error starting initial video:', error);
      });
    }
  }, []);

  // loopVideoPathsが変更されたときの初期化処理
  useEffect(() => {
    const previousPaths = previousLoopVideoPathsRef.current;
    const pathsChanged =
      previousPaths.length !== loopVideoPaths.length ||
      previousPaths.some((p, i) => p !== loopVideoPaths[i]);

    if (!pathsChanged) {
      return;
    }

    // 新しいloop動画の最初の1つを選択
    const newLoopVideo = loopVideoPaths[0] || '';
    setCurrentLoopVideoPath(newLoopVideo);
    lastPlayedLoopVideoRef.current = null;

    const updateVideoIfUsingPreviousLoop = (
      videoRef: MutableRefObject<HTMLVideoElement | null>,
      currentSrc: string,
      setSrc: (value: SetStateAction<string>) => void,
      shouldAutoplay: boolean
    ) => {
      // 現在のsrcが旧loop動画のいずれかであれば更新
      if (!previousPaths.includes(currentSrc)) {
        return;
      }

      setSrc(newLoopVideo);
      const video = videoRef.current;
      if (!video) {
        return;
      }

      video.src = newLoopVideo;
      video.load();
      if (shouldAutoplay) {
        video
          .play()
          .catch((error) => {
            console.error('Error playing updated loop video:', error);
          });
      }
    };

    updateVideoIfUsingPreviousLoop(
      video1Ref,
      video1Src,
      setVideo1Src,
      !isGeneratedVideo && activeVideo === 1
    );
    updateVideoIfUsingPreviousLoop(
      video2Ref,
      video2Src,
      setVideo2Src,
      !isGeneratedVideo && activeVideo === 2
    );

    previousLoopVideoPathsRef.current = loopVideoPaths;
  }, [
    loopVideoPaths,
    video1Src,
    video2Src,
    isGeneratedVideo,
    activeVideo,
  ]);

  // 音声状態が変更されたときに、両方のvideo要素の音声状態を更新
  useEffect(() => {
    if (video1Ref.current) {
      video1Ref.current.muted = !isAudioEnabled;
    }
    if (video2Ref.current) {
      video2Ref.current.muted = !isAudioEnabled;
    }
  }, [isAudioEnabled]);

  // 動画シーケンスを統合処理（順序を保証）
  // generatedVideoPath を先に、initialQueue をその後に処理
  useEffect(() => {
    const currentVideoSrc = activeVideo === 1 ? video1Src : video2Src;

    // 処理する新しい動画を収集（順序を保証）
    const newVideos: string[] = [];

    // まず generatedVideoPath（最初の動画）を確認
    if (
      generatedVideoPath &&
      !processedVideoPathsRef.current.has(generatedVideoPath) &&
      generatedVideoPath !== currentVideoSrc &&
      !pendingGeneratedVideos.includes(generatedVideoPath)
    ) {
      newVideos.push(generatedVideoPath);
    }

    // 次に initialQueue の動画を追加
    if (initialQueue && initialQueue.length > 0) {
      for (const path of initialQueue) {
        if (
          !processedVideoPathsRef.current.has(path) &&
          !newVideos.includes(path) &&
          !pendingGeneratedVideos.includes(path)
        ) {
          newVideos.push(path);
        }
      }
    }

    if (newVideos.length === 0) return;

    // 処理済みとしてマーク
    newVideos.forEach((path) => processedVideoPathsRef.current.add(path));

    // 現在再生中の動画が生成動画の場合は、キューに追加するだけ
    if (isGeneratedVideo) {
      setTimeout(() => {
        setPendingGeneratedVideos((prev) => {
          const videosToAdd = newVideos.filter((v) => !prev.includes(v));
          return videosToAdd.length > 0 ? [...prev, ...videosToAdd] : prev;
        });
      }, 0);
      return;
    }

    // ループ動画再生中の場合、最初の動画を事前読み込み
    const firstVideo = newVideos[0];
    const nextVideoRef = activeVideo === 1 ? video2Ref : video1Ref;
    const nextOpacitySetter =
      activeVideo === 1 ? setVideo2Opacity : setVideo1Opacity;
    const nextVideo = nextVideoRef.current;
    if (nextVideo) {
      // 動画要素を確実に非表示にする（DOM操作で即座に適用）
      nextVideo.style.opacity = '0';
      nextVideo.style.pointerEvents = 'none';
      // 状態も非同期で更新
      setTimeout(() => {
        nextOpacitySetter(0);
      }, 0);
      nextVideo.src = firstVideo;
      nextVideo.muted = true; // 事前読み込み中は常にミュート（音声漏れ防止）
      nextVideo.preload = 'auto';
      nextVideo.load();
    }

    // 状態を更新（非同期で設定）
    setTimeout(() => {
      setPendingGeneratedVideos((prev) => {
        const videosToAdd = newVideos.filter((v) => !prev.includes(v));
        return videosToAdd.length > 0 ? [...prev, ...videosToAdd] : prev;
      });
    }, 0);
  }, [
    generatedVideoPath,
    initialQueue,
    pendingGeneratedVideos,
    activeVideo,
    isAudioEnabled,
    video1Src,
    video2Src,
    isGeneratedVideo,
  ]);

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

      // 切り替え前に確実に次の動画を非表示にする
      nextOpacitySetter(0);
      if (nextVideo) {
        nextVideo.style.opacity = '0';
        nextVideo.style.pointerEvents = 'none';
      }

      // 次の動画のsrcを更新
      nextSrcSetter(newSrc);
      nextVideo.muted = !isAudioEnabled;
      nextVideo.currentTime = 0;

      // 次の動画が既に読み込まれている場合は、即座に切り替え
      if (nextVideo.readyState >= 3) {
        // HAVE_FUTURE_DATA以上（十分に読み込まれている）
        // フェードなしで即座に切り替え
        currentOpacitySetter(0);
        if (currentVideo) {
          currentVideo.style.opacity = '0';
        }
        nextOpacitySetter(1);
        if (nextVideo) {
          nextVideo.style.opacity = '1';
          nextVideo.style.pointerEvents = 'auto';
        }
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
        if (currentVideo) {
          currentVideo.style.opacity = '0';
        }
        nextOpacitySetter(1);
        if (nextVideo) {
          nextVideo.style.opacity = '1';
          nextVideo.style.pointerEvents = 'auto';
        }
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
      const currentSrc = activeVideo === 1 ? video1Src : video2Src;

      if (isGeneratedVideo) {
        // 生成動画が終了したら、まずonVideoEndを呼んで使用済みとしてマーク
        onVideoEnd?.(currentSrc || null);
        // キューから現在の動画を削除（重複再生を防ぐ）
        const remainingVideos = pendingGeneratedVideos.filter(
          (path) => path !== currentSrc
        );
        setPendingGeneratedVideos(remainingVideos);

        // キューに次の動画がある場合は、ループ動画をスキップして次の動画に直接切り替え
        if (remainingVideos.length > 0) {
          const [nextVideoPath, ...restVideos] = remainingVideos;
          setPendingGeneratedVideos(restVideos);
          switchVideo(nextVideoPath, true);
        } else {
          // キューが空の場合はafterQueueVideoPaths（指定されている場合）またはランダムなループ動画に戻る
          const targetPaths = afterQueueVideoPaths.length > 0 ? afterQueueVideoPaths : loopVideoPaths;
          const nextVideo = getRandomLoopVideo(targetPaths, lastPlayedLoopVideoRef.current);
          lastPlayedLoopVideoRef.current = nextVideo;
          setCurrentLoopVideoPath(nextVideo);
          switchVideo(nextVideo, false);
        }
      } else {
        // ループ動画が終了したら、キューから最初の動画を取得
        if (pendingGeneratedVideos.length > 0) {
          const [nextVideoPath, ...remainingVideos] = pendingGeneratedVideos;
          // キューを更新してから切り替え（重複再生を防ぐ）
          setPendingGeneratedVideos(remainingVideos);
          switchVideo(nextVideoPath, true);
        } else {
          // 生成動画がなければ、次のランダムなループ動画に切り替え
          const nextLoopVideo = getRandomLoopVideo(loopVideoPaths, lastPlayedLoopVideoRef.current);
          lastPlayedLoopVideoRef.current = nextLoopVideo;
          setCurrentLoopVideoPath(nextLoopVideo);
          if (nextLoopVideo === currentLoopVideoPath) {
            // 同じ動画の場合は再生を再開
            video.play().catch((error) => {
              console.error('Error replaying video:', error);
            });
          } else {
            // 異なる動画の場合は切り替え
            switchVideo(nextLoopVideo, false);
          }
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
    pendingGeneratedVideos,
    loopVideoPaths,
    currentLoopVideoPath,
    afterQueueVideoPaths,
    onVideoEnd,
    switchVideo,
    video1Src,
    video2Src,
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
    const isLoopVideo = (src: string) =>
      loopVideoPaths.some((path) => src.includes(path));

    const handleError1 = (e: Event) => {
      console.error('Error loading video1:', e);
      const video = video1Ref.current;
      if (!video) return;

      // ループ動画の読み込みエラーの場合は、再試行
      if (isLoopVideo(video.src) && !isGeneratedVideo) {
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
      if (isLoopVideo(video.src) && !isGeneratedVideo) {
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
  }, [loopVideoPaths, isGeneratedVideo]);

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
