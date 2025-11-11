# Movie Tuber - AI配信チャットアプリ

AIとのチャットをリアルタイムで配信するWebアプリケーションです。

## 機能

- ユーザーがチャットを入力すると、OpenAIが回答を生成
- 生成された回答をもとに動画生成APIを呼び出し
- 背景にループ動画を再生
- 動画生成が完了したら、ループ動画の区切りで生成動画に切り替え
- 生成動画が終了したら、ループ動画に戻る

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
OPENAI_API_KEY=your_openai_api_key_here
VIDEO_GENERATION_API_URL=http://localhost:3001/api/generate-video
VOICEVOX_ENDPOINT=http://localhost:10101
VOICE_ID=633572448
```

### 3. ループ動画の配置

`public/videos/`ディレクトリを作成し、ループ動画を`loop-video.mp4`として配置してください：

```bash
mkdir -p public/videos
# ループ動画を loop-video.mp4 として配置
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
movie-tuber/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # チャットAPI（OpenAI統合）
│   │   ├── generate-video-callback/
│   │   │   └── route.ts          # 動画生成コールバックAPI
│   │   └── video/
│   │       └── route.ts          # 動画ファイル配信API
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # メインページ
├── components/
│   ├── VideoPlayer.tsx           # 動画プレーヤーコンポーネント
│   ├── ChatInput.tsx             # チャット入力コンポーネント
│   └── ChatHistory.tsx           # チャット履歴コンポーネント
├── lib/
│   └── openai.ts                 # OpenAIクライアント設定
└── public/
    └── videos/
        └── loop-video.mp4        # ループ動画（ユーザーが配置）
```

## 使用方法

1. アプリを起動すると、背景にループ動画が再生されます
2. 下部の入力欄からメッセージを入力して送信
3. OpenAIが回答を生成し、その回答をもとに動画生成APIが呼び出されます
4. 動画生成が完了したら、ループ動画の次の区切りで生成動画に切り替わります
5. 生成動画が終了したら、ループ動画に戻ります

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **状態管理**: React Hooks
- **外部API**: OpenAI API、動画生成API

## 注意事項

- 動画生成API（`http://localhost:3001/api/generate-video`）が起動している必要があります
- VoiceVox（`http://localhost:10101`）が起動している必要があります
- ループ動画ファイル（`public/videos/loop-video.mp4`）を配置する必要があります
