# Research & Design Decisions

## Summary
- **Feature**: `direct-script-sender`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存の `/api/generate-video` APIは `VideoRequest[]` を受け取り、動画生成サーバーへ直接送信可能
  - VideoPlayerは `generatedVideoPath` propsで動画URLを受け取り、キューイング機能を内蔵
  - 設定ファイルは `/config/` に JSON 形式で配置するパターンが確立済み

## Research Log

### 既存の動画生成フロー
- **Context**: 台本直接送信機能を追加するにあたり、既存フローを理解する必要があった
- **Sources Consulted**: `app/api/chat/route.ts`, `app/api/generate-video/route.ts`
- **Findings**:
  - 現在のフロー: Chat → Mastra Workflow → generate-video API → 外部動画生成サーバー
  - `VideoRequest` 型: `{ action: string; params: Record<string, unknown> }`
  - `speak` アクション: `{ action: 'speak', params: { text: string; emotion: string } }`
  - 動画生成APIは `/api/generate-video` で、外部サーバー（VIDEO_GENERATION_API_URL）にリクエスト転送
- **Implications**: 台本送信は `/api/generate-video` を直接呼び出すことで、LLM（Mastraワークフロー）をバイパス可能

### VideoPlayerコンポーネントの統合
- **Context**: 生成された動画をどのように再生するか
- **Sources Consulted**: `components/VideoPlayer.tsx`, `app/page.tsx`
- **Findings**:
  - `generatedVideoPath` propsで動画URLを渡すと自動再生
  - `initialQueue` propsで複数動画をキューイング可能
  - `onVideoEnd` コールバックで動画終了を検知
  - ポーリング方式で `/api/generate-video-callback` から新しい動画を取得
- **Implications**: 既存の `generatedVideoPath` 機構を再利用可能

### 設定ファイルパターン
- **Context**: 台本データの保存場所と形式
- **Sources Consulted**: `config/control-buttons.json`, `app/api/settings/control-buttons/route.ts`
- **Findings**:
  - `/config/` ディレクトリにJSONファイルを配置
  - API Route経由で読み込み（Server-side）
  - クライアントはAPI経由でfetch
- **Implications**: 同様のパターンで `scripts.json` を配置し、専用APIで読み込み

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 専用API経由 | クライアント → /api/script-send → generate-video | 既存パターン踏襲、エラーハンドリング集約 | API層が増える | 採用 |
| B: クライアント直接呼び出し | クライアント → /api/generate-video 直接 | シンプル | エラーハンドリング分散 | 不採用 |

## Design Decisions

### Decision: 専用API `/api/script-send` の導入
- **Context**: 台本データをどのように動画生成APIに送信するか
- **Alternatives Considered**:
  1. クライアントから `/api/generate-video` を直接呼び出す
  2. 専用の `/api/script-send` APIを経由する
- **Selected Approach**: 専用API経由
- **Rationale**:
  - バリデーションとエラーハンドリングをサーバーサイドに集約
  - 将来的な拡張（ログ記録、権限チェック等）に対応しやすい
  - 既存の chat → generate-video パターンと一貫性を保つ
- **Trade-offs**: API層が1つ増えるが、保守性が向上
- **Follow-up**: 実装時にエラーレスポンス形式を統一

### Decision: 台本データ形式
- **Context**: 台本にどのようなデータを含めるか
- **Alternatives Considered**:
  1. テキストのみ
  2. テキスト + emotion
  3. テキスト + 完全なVideoRequest配列
- **Selected Approach**: テキスト + emotion（オプション）
- **Rationale**:
  - 配信者にとって直感的（セリフとその感情を指定）
  - 既存の `speak` アクションと互換
  - 必要に応じて他のパラメータも追加可能な構造
- **Trade-offs**: 柔軟性は少し下がるが、使いやすさを優先
- **Follow-up**: 拡張性のため `params` フィールドも許可

## Risks & Mitigations
- **Risk 1**: 台本ファイルの読み込みエラー → フォールバックとして空配列を返し、UIでエラー表示
- **Risk 2**: 動画生成APIとの通信失敗 → 既存のエラーハンドリングパターンを踏襲（再試行ボタン）
- **Risk 3**: 不正な台本データ → JSONスキーマでバリデーション、型安全性を確保

## References
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 既存実装: `/app/api/chat/route.ts`, `/app/api/generate-video/route.ts`
