let loopVideoPath: string | null = null;

export const getLoopVideoPath = () => loopVideoPath;

export const setLoopVideoPath = (newPath: string | null | undefined) => {
  if (!newPath || typeof newPath !== 'string') {
    return;
  }
  loopVideoPath = newPath;
};
