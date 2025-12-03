let loopVideoPaths: string[] = [];
let lastPlayedIndex: number = -1;

export const getLoopVideoPaths = () => loopVideoPaths;

export const setLoopVideoPaths = (newPaths: string[] | null | undefined) => {
  if (!newPaths || !Array.isArray(newPaths)) {
    return;
  }
  loopVideoPaths = newPaths.filter((p) => typeof p === 'string' && p.length > 0);
  lastPlayedIndex = -1;
};

export const addLoopVideoPath = (newPath: string | null | undefined) => {
  if (!newPath || typeof newPath !== 'string') {
    return;
  }
  if (!loopVideoPaths.includes(newPath)) {
    loopVideoPaths.push(newPath);
  }
};

export const clearLoopVideoPaths = () => {
  loopVideoPaths = [];
  lastPlayedIndex = -1;
};

export const getNextLoopVideoPath = (): string | null => {
  if (loopVideoPaths.length === 0) {
    return null;
  }

  if (loopVideoPaths.length === 1) {
    lastPlayedIndex = 0;
    return loopVideoPaths[0];
  }

  // 2つ以上の場合、前回と違うインデックスをランダムに選択
  let nextIndex: number;
  do {
    nextIndex = Math.floor(Math.random() * loopVideoPaths.length);
  } while (nextIndex === lastPlayedIndex);

  lastPlayedIndex = nextIndex;
  return loopVideoPaths[nextIndex];
};

// 後方互換性のための旧API
export const getLoopVideoPath = () => loopVideoPaths[0] ?? null;

export const setLoopVideoPath = (newPath: string | null | undefined) => {
  if (!newPath || typeof newPath !== 'string') {
    return;
  }
  addLoopVideoPath(newPath);
};
