# Startup動画機能 仕様書

## 概要

アプリケーション起動時に、ループ動画の前に1回だけ再生される「Startup動画」機能。

## フロー

```
アプリ起動
    ↓
[startup.enabled = true?]
    ├─ Yes → Startup動画を生成・再生（1回のみ）→ Loop動画へ移行
    └─ No  → Loop動画を即座に再生開始
```

## 設定ファイル

### `config/video-generation.json`

```json
{
  "presetId": "character",
  "startup": {
    "enabled": true,
    "requests": [
      { "action": "start", "params": {} },
      { "action": "speak", "params": { "text": "こんにちは！", "emotion": "neutral" } }
    ]
  },
  "actions": {
    "loop": { "params": {} },
    "speak": { "params": { "text": "", "emotion": "neutral" } },
    "idle": { "params": { "durationMs": 2000 } }
  },
  "emotions": ["neutral", "thinking"],
  "idleDurationRange": { "min": 2000, "max": 3000 }
}
```

### 設定項目

| 項目 | 型 | 説明 |
|------|------|------|
| `startup.enabled` | boolean | Startup動画機能の有効/無効 |
| `startup.requests` | array | Animation Streamerに送信するアクションの配列 |
| `startup.requests[].action` | string | アクション名（`start`, `speak`, カスタムアクション等） |
| `startup.requests[].params` | object | アクションのパラメータ |

## API

### GET `/api/startup-video`

Startup動画の状態を取得。

**レスポンス:**
```json
{
  "enabled": true,
  "startupVideoPath": "/api/video?path=...",
  "hasPlayed": false
}
```

| フィールド | 型 | 説明 |
|------------|------|------|
| `enabled` | boolean | Startup機能が有効か |
| `startupVideoPath` | string\|null | 動画のURL（未生成時はnull） |
| `hasPlayed` | boolean | 再生済みフラグ |

### POST `/api/startup-video`

Startup動画を再生済みとしてマーク。

**レスポンス:**
```json
{
  "success": true
}
```

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `lib/videoGenerationConfig.ts` | 設定ファイルの読み込み・型定義 |
| `lib/startupVideoStore.ts` | Startup動画の状態管理（メモリ内） |
| `app/api/startup-video/route.ts` | Startup動画API |
| `app/page.tsx` | フロントエンド制御 |

## 動作詳細

1. **初回アクセス時**
   - `/api/startup-video` を呼び出し、`enabled`/`hasPlayed`を確認
   - `enabled=true` かつ `hasPlayed=false` の場合、Animation StreamerにStartup動画生成をリクエスト

2. **動画再生**
   - Startup動画が準備できるまでローディング表示
   - Startup動画 → Loop動画の順で再生

3. **再生完了時**
   - `POST /api/startup-video` で再生済みフラグを更新
   - 以降はLoop動画のみ再生

## Animation Streamer連携

`startup.requests`の内容がそのままAnimation Streamerの`/api/generate`に送信される。

```json
{
  "presetId": "character",
  "stream": true,
  "requests": [
    { "action": "start", "params": {} },
    { "action": "speak", "params": { "text": "こんにちは！", "emotion": "neutral" } }
  ]
}
```

複数アクションを指定した場合、Animation Streamerが1本の動画として結合して返却。
