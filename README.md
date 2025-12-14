# 動画作成AITuberコアシステム - Video AITuber Core System

AIとのチャットをリアルタイムで配信するWebアプリケーション。AIアバターがユーザーの入力に応答し、動的に作成された動画で表現します。

## 主要機能

- **リアルタイムAIチャット**: ユーザーの入力に対してAIがリアルタイムで応答を生成
- **動画連携**: AI応答に基づいてアバター動画を自動作成・再生
- **配信向けUI**: ループ動画による待機状態と応答動画のシームレスな切り替え
- **外部コメント連携**: わんコメ（OneComme）と連携し、配信コメントを取り込み
- **リモート操作パネル**: 別デバイスからの配信操作（画面モード選択、開始/終了動画再生、台本送信）

## ユースケース

- **AIアバター配信**: AIキャラクターによるライブ配信コンテンツの作成
- **インタラクティブ対話**: 視聴者とAIアバターのリアルタイム会話
- **視聴者コメント反応**: 配信コメントに対するAIアバターの自動応答

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/video-aituber.git
cd video-aituber
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `AITUBER_WORKFLOW_URL` | Mastraワークフローエンドポイント | `http://localhost:4111` |
| `VIDEO_GENERATION_API_URL` | 動画作成APIエンドポイント | `http://localhost:4000/api/generate` |

```env
AITUBER_WORKFLOW_URL=http://localhost:4111
VIDEO_GENERATION_API_URL=http://localhost:4000/api/generate
```

### 4. 動画作成設定ファイルの作成

`config/example.video-generation.json` を `config/video-generation.json` にコピーし、環境に合わせて編集してください：

```bash
cp config/example.video-generation.json config/video-generation.json
```

設定項目：

```json
{
  "presetId": "anchor-a",
  "actions": {
    "loop": { "params": {} },
    "speak": { "params": { "text": "", "emotion": "neutral" } },
    "idle": { "params": { "durationMs": 2000 } }
  },
  "emotions": ["neutral", "happy"],
  "idleDurationRange": { "min": 2000, "max": 3000 }
}
```

- `presetId`: 動画作成APIで定義されたプリセットID（Animation-Streamerの場合は`anchor-a`など）
- `actions`: 利用可能なアクションとそのデフォルトパラメータ
- `emotions`: 発話時に指定できる感情の種類
- `idleDurationRange`: idle時間の範囲（ミリ秒）

※ `config/video-generation.json` はGit管理対象外です。

### 5. 動画作成APIの準備

- `VIDEO_GENERATION_API_URL` が指す動画作成APIサーバーを起動しておきます
- **事前にAPIへ `loop` アクションを追加し、リクエスト `{ action: 'loop', ... }` に応じてループ動画を生成できるよう実装しておいてください**
- APIは `requests: [{ action: 'loop', ... }]` を受け取るとループ動画を生成し、`result` の `outputPath` あるいは `params.loopVideoPath` に動画のパスを含める必要があります
- このアプリは `/api/loop-video` 経由でループ動画のパスを取得し、以降の再生で共有します

### 6. 開発サーバーの起動

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
│   │   │   └── route.ts          # 動画作成コールバックAPI
│   │   ├── loop-video/
│   │   │   └── route.ts          # ループ動画の生成/取得API
│   │   ├── remote/
│   │   │   ├── command/
│   │   │   │   └── route.ts      # リモートコマンド受信API
│   │   │   ├── events/
│   │   │   │   └── route.ts      # SSE状態配信API
│   │   │   └── state/
│   │   │       └── route.ts      # 状態取得・更新API
│   │   └── video/
│   │       └── route.ts          # 動画ファイル配信API
│   ├── remote/
│   │   └── page.tsx              # リモート操作パネルページ
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # メインページ
├── components/
│   ├── VideoPlayer.tsx           # 動画プレーヤーコンポーネント
│   ├── ChatInput.tsx             # チャット入力コンポーネント
│   └── ChatHistory.tsx           # チャット履歴コンポーネント
├── config/
│   ├── example.video-generation.json  # 動画作成設定の例
│   └── video-generation.json          # 動画作成設定（Git管理対象外）
├── hooks/
│   ├── useMainScreenSync.ts      # メイン画面の状態同期フック
│   └── useRemoteSync.ts          # リモートパネルの状態同期フック
├── lib/
│   ├── loopVideoStore.ts         # ループ動画のパスを保持するサーバーストア
│   ├── openai.ts                 # OpenAIクライアント設定
│   ├── remoteState.ts            # リモート状態管理
│   └── videoGenerationConfig.ts  # 動画作成設定の読み込み
└── public/
    └── ...                       # 必要に応じて静的ファイルを配置
```

### 命名規則

| 種別 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `VideoPlayer.tsx`, `ChatInput.tsx` |
| Hooks | `use` + PascalCase | `useOneComme.ts`, `useMainScreenSync.ts` |
| ユーティリティ | camelCase | `loopVideoStore.ts`, `remoteState.ts` |
| APIディレクトリ | kebab-case | `generate-video-callback/`, `loop-video/` |

### APIエンドポイント一覧

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/chat` | POST | チャットメッセージ処理・LLM応答生成 |
| `/api/generate-video-callback` | POST | 動画作成コールバック受信 |
| `/api/loop-video` | GET | ループ動画パスの取得 |
| `/api/video` | GET | 動画ファイル配信 |
| `/api/remote/command` | POST | リモートコマンド受信 |
| `/api/remote/events` | GET | SSEによる状態配信 |
| `/api/remote/state` | GET/POST | 状態取得・更新 |

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | プロダクションビルドを作成 |
| `npm run start` | プロダクションサーバーを起動 |
| `npm run lint` | ESLintによるコードチェック |
| `npm run test` | テストを実行 |
| `npm run test:watch` | ウォッチモードでテストを実行 |

## 使用方法

### 基本操作
1. アプリを起動すると、バックエンドで `/api/loop-video` が呼ばれ、動画作成APIから取得したループ動画が背景に再生されます
2. 下部の入力欄からメッセージを入力して送信
3. OpenAIが回答を生成し、その回答をもとに動画作成APIが呼び出されます
4. APIレスポンスでは`speak`/`idle`ごとに動画クリップがストリーミングで返却され、受信した順番に自動再生されます
5. すべてのクリップを再生し終えると、ループ動画に戻ります

### リモート操作パネル
別画面・別デバイスから配信を操作できます。

1. メイン画面 [http://localhost:3000](http://localhost:3000) を起動
2. 別ブラウザ・タブで [http://localhost:3000/remote](http://localhost:3000/remote) を開く
3. リモートパネルから以下の操作が可能:
   - **画面モード選択**: 待機画面または初期画面を選択して配信開始
   - **開始/終了ボタン**: 開始・終了動画を再生
   - **わんコメ連携**: コメント連携のON/OFF切り替え
   - **台本送信**: 事前に用意した台本を送信して動画作成

## 動画作成APIとの連携

- `app/api/chat/route.ts`では、OpenAIに対して「スピーチ」「アイドル」「ループ」のアクション列をJSONで生成させ、動画作成APIへ`{ stream: true, requests: [...] }`という形式で送信します（API側にループアクションを実装しておく前提です）
- 動画作成APIのレスポンスはNDJSONで逐次返却されます。`action === 'loop'` の結果はサーバー内の `loopVideoStore` に保存し、`/api/loop-video` が再利用します
- その他の`result.outputPath`は`/api/generate-video-callback`に転送され、フロントエンド側の再生キューに追加されます
- フロントエンド（`app/page.tsx`）はコールバックAPIをポーリングし、受信した順番を維持したまま動画を1本ずつ再生します

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| 言語 | TypeScript | strict mode |
| フレームワーク | Next.js (App Router) | 16 |
| UIライブラリ | React | 19 |
| スタイリング | Tailwind CSS | 4 |
| ランタイム | Node.js | 20+ |
| テスト | Vitest | 4 |

### 外部サービス連携

| サービス | 説明 | 設定 |
|---------|------|------|
| **Mastraワークフロー** | LLM応答生成を外部ワークフローに委譲。チャットメッセージを受け取り、AIの応答テキストと感情・アクション情報を返す | `AITUBER_WORKFLOW_URL` |
| **動画作成API** | AI応答に対応するアバター動画を生成。speak/idle/loopアクションに応じた動画をストリーミング形式で返却 | `VIDEO_GENERATION_API_URL` |
| **わんコメ（OneComme）** | 配信コメントの取り込み。YouTube、Twitch、ニコ生など各種配信サービスのコメントをリアルタイムで取得し、AIに送信 | デフォルトポート: 11180 |

#### わんコメ連携の仕組み

わんコメ（OneComme）は配信コメント管理ツールで、本アプリはOneSDK（JavaScript SDK）を使用して連携します。

1. わんコメをローカルで起動（デフォルト: `http://localhost:11180`）
2. アプリ起動時にOneSDKスクリプトを動的に読み込み
3. `useOneComme` Hookでコメントを購読・取得
4. 新着コメントをAIに送信し、応答動画を生成

リモートパネルからわんコメ連携のON/OFFを切り替えられます。

## アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ユーザー入力                               │
│              (チャット入力 / わんコメ / 台本送信)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         フロントエンド                               │
│                     (Next.js App Router)                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │
│  │ ChatInput  │  │useOneComme │  │ Remote     │                     │
│  │ Component  │  │   Hook     │  │ Panel      │                     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                     │
│        └───────────────┴───────────────┘                            │
│                        │                                            │
└────────────────────────┼────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    /api/chat (POST)                                 │
│                  チャットメッセージ処理                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Mastraワークフロー                                 │
│               (AITUBER_WORKFLOW_URL)                                │
│         LLM応答生成 + アクション列生成                               │
│    [{ action: 'speak', text: '...', emotion: 'happy' },            │
│     { action: 'idle', durationMs: 2000 }, ...]                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      動画作成API                                    │
│              (VIDEO_GENERATION_API_URL)                            │
│           NDJSONストリーミングで動画を逐次返却                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                /api/generate-video-callback (POST)                 │
│                    動画パス受信・キュー追加                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VideoPlayer                                    │
│                 ダブルバッファリング再生                              │
└─────────────────────────────────────────────────────────────────────┘
```

### ダブルバッファリング方式

動画のシームレスな切り替えを実現するため、2つの`<video>`要素を使用したダブルバッファリングを採用しています。

```
┌─────────────────────────────────────────────────────────────┐
│                    VideoPlayer Component                    │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   Video Element A   │    │   Video Element B   │        │
│  │   (active/visible)  │    │   (preloading)      │        │
│  │                     │    │                     │        │
│  │   現在再生中の動画   │    │   次の動画を事前読込  │        │
│  └─────────────────────┘    └─────────────────────┘        │
│             │                         │                    │
│             └────────┬────────────────┘                    │
│                      ▼                                     │
│            再生完了時にA/Bを切り替え                         │
│            → 待ち時間なしで次の動画へ                        │
└─────────────────────────────────────────────────────────────┘
```

**メリット**:
- 動画切り替え時の黒画面やちらつきを防止
- 次の動画を事前に読み込むことでシームレスな再生を実現
- ループ動画と応答動画の切り替えもスムーズに処理

### ポーリング方式

動画作成の状態取得にはポーリング方式を採用しています。

```
┌──────────────┐         定期的にリクエスト          ┌──────────────┐
│              │  ──────────────────────────────▶  │              │
│  フロントエンド │                                   │   APIサーバー  │
│              │  ◀──────────────────────────────  │              │
└──────────────┘         最新状態を返却            └──────────────┘

タイムライン:
  0ms    500ms   1000ms  1500ms  2000ms
   │       │       │       │       │
   ├───────┼───────┼───────┼───────┤
   │  GET  │  GET  │  GET  │  GET  │
   ▼       ▼       ▼       ▼       ▼
  [ ]     [ ]     [📹]    [📹📹]  [ ]
              新動画検出  追加検出  処理完了
```

**採用理由**:
- 実装のシンプルさ（WebSocket接続管理が不要）
- 状態の整合性が取りやすい
- サーバー側の複雑性を抑制

## 注意事項

- 動画作成API（`http://localhost:4000/api/generate`）が起動している必要があります
- ループ動画はAPIから取得するため、動画作成側が`loop`アクションに応答する実装と動画ファイルの提供を行ってください
