import { NextResponse } from 'next/server';
import { getLoopVideoPath, setLoopVideoPath } from '@/lib/loopVideoStore';

let loopVideoRequestPromise: Promise<string | null> | null = null;

async function requestLoopVideoFromGenerator(): Promise<string | null> {
  try {
    const videoGenerationUrl =
      process.env.VIDEO_GENERATION_API_URL ||
      'http://localhost:4000/api/generate';
    const characterId =
      process.env.VIDEO_GENERATION_CHARACTER_ID || 'character';

    const response = await fetch(videoGenerationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characterId,
        stream: true,
        requests: [{ action: 'loop', params: {} }],
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to request loop video generation');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resolvedLoopPath: string | null = null;

    const processLine = (line: string) => {
      if (!line.trim() || resolvedLoopPath) {
        return;
      }

      try {
        const data = JSON.parse(line);
        if (data.type === 'result' && data.result) {
          const result = data.result;
          if (result.action === 'loop') {
            const loopPath =
              result.params?.path ||
              result.params?.loopVideoPath ||
              result.outputPath;

            if (typeof loopPath === 'string' && loopPath.length > 0) {
              const loopVideoUrl =
                loopPath.startsWith('/api/') || loopPath.startsWith('http')
                  ? loopPath
                  : `/api/video?path=${encodeURIComponent(loopPath)}`;
              setLoopVideoPath(loopVideoUrl);
              resolvedLoopPath = loopVideoUrl;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing loop video response line:', error);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(processLine);
        if (resolvedLoopPath) {
          break;
        }
      }
      if (done) {
        if (buffer) {
          processLine(buffer);
        }
        break;
      }
    }

    return resolvedLoopPath || getLoopVideoPath();
  } catch (error) {
    console.error('Error generating loop video:', error);
    return getLoopVideoPath();
  }
}

export async function GET() {
  try {
    let loopVideoPath = getLoopVideoPath();

    if (!loopVideoPath) {
      if (!loopVideoRequestPromise) {
        loopVideoRequestPromise = requestLoopVideoFromGenerator();
        loopVideoRequestPromise.finally(() => {
          loopVideoRequestPromise = null;
        });
      }
      loopVideoPath = await loopVideoRequestPromise;
    }

    return NextResponse.json({
      loopVideoPath: loopVideoPath || null,
    });
  } catch (error) {
    console.error('Error getting loop video path:', error);
    return NextResponse.json(
      { error: 'Failed to get loop video path' },
      { status: 500 }
    );
  }
}
