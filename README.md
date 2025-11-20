# Movie Tuber - AI配信チャットアプリ

AIとのチャットをリアルタイムで配信するWebアプリケーションです。

## 機能

- ユーザーがチャットを入力すると、OpenAIが回答を生成
- 生成された回答をもとに動画生成APIを呼び出し
- 動画生成APIから取得したループ動画を背景に自動再生
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
VIDEO_GENERATION_API_URL=http://localhost:4000/api/generate
```

### 3. 動画生成APIの準備

- `VIDEO_GENERATION_API_URL` が指す動画生成APIサーバーを起動しておきます
- **事前にAPIへ `loop` アクションを追加し、リクエスト `{ action: 'loop', ... }` に応じてループ動画を生成できるよう実装しておいてください**
- APIは `requests: [{ action: 'loop', ... }]` を受け取るとループ動画を生成し、`result` の `outputPath` あるいは `params.loopVideoPath` に動画のパスを含める必要があります
- このアプリは `/api/loop-video` 経由でループ動画のパスを取得し、以降の再生で共有します

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
│   │   ├── loop-video/
│   │   │   └── route.ts          # ループ動画の生成/取得API
│   │   └── video/
│   │       └── route.ts          # 動画ファイル配信API
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # メインページ
├── components/
│   ├── VideoPlayer.tsx           # 動画プレーヤーコンポーネント
│   ├── ChatInput.tsx             # チャット入力コンポーネント
│   └── ChatHistory.tsx           # チャット履歴コンポーネント
├── lib/
│   ├── loopVideoStore.ts         # ループ動画のパスを保持するサーバーストア
│   └── openai.ts                 # OpenAIクライアント設定
└── public/
    └── ...                       # 必要に応じて静的ファイルを配置
```

## 使用方法

1. アプリを起動すると、バックエンドで `/api/loop-video` が呼ばれ、動画生成APIから取得したループ動画が背景に再生されます
2. 下部の入力欄からメッセージを入力して送信
3. OpenAIが回答を生成し、その回答をもとに動画生成APIが呼び出されます
4. APIレスポンスでは`speak`/`idle`ごとに動画クリップがストリーミングで返却され、受信した順番に自動再生されます
5. すべてのクリップを再生し終えると、ループ動画に戻ります

## 動画生成APIとの連携

- `app/api/chat/route.ts`では、OpenAIに対して「スピーチ」「アイドル」「ループ」のアクション列をJSONで生成させ、動画生成APIへ`{ stream: true, requests: [...] }`という形式で送信します（API側にループアクションを実装しておく前提です）
- 動画生成APIのレスポンスはNDJSONで逐次返却されます。`action === 'loop'` の結果はサーバー内の `loopVideoStore` に保存し、`/api/loop-video` が再利用します
- その他の`result.outputPath`は`/api/generate-video-callback`に転送され、フロントエンド側の再生キューに追加されます
- フロントエンド（`app/page.tsx`）はコールバックAPIをポーリングし、受信した順番を維持したまま動画を1本ずつ再生します

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **状態管理**: React Hooks
- **外部API**: OpenAI API、動画生成API

## 注意事項

- 動画生成API（`http://localhost:4000/api/generate`）が起動している必要があります
- ループ動画はAPIから取得するため、動画生成側が`loop`アクションに応答する実装と動画ファイルの提供を行ってください
