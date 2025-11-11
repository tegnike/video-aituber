import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoPath = searchParams.get('path');

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // パスの検証（セキュリティ対策）
    // 絶対パスのみ許可し、相対パスや危険なパスを拒否
    if (!path.isAbsolute(videoPath)) {
      return NextResponse.json(
        { error: 'Invalid video path' },
        { status: 400 }
      );
    }

    // ファイルが存在するか確認
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // ファイルが動画ファイルか確認（拡張子チェック）
    const ext = path.extname(videoPath).toLowerCase();
    const allowedExtensions = ['.mp4', '.webm', '.ogg'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // 動画ファイルを読み込み
    const videoBuffer = fs.readFileSync(videoPath);
    const contentType =
      ext === '.mp4'
        ? 'video/mp4'
        : ext === '.webm'
          ? 'video/webm'
          : ext === '.ogg'
            ? 'video/ogg'
            : 'video/mp4';

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    );
  }
}

