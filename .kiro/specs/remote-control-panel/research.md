# Research & Design Decisions

## Summary
- **Feature**: `remote-control-panel`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存のポーリング方式（1秒間隔）を活用し、新たなWebSocketは導入しない
  - Server-Sent Events (SSE) がリアルタイム同期に最適
  - 既存のAPI構造とReact Hooks パターンを踏襲

## Research Log

### リアルタイム通信方式の選定
- **Context**: メイン画面とリモートパネル間の状態同期方式を決定
- **Sources Consulted**:
  - [Next.js SSE Implementation](https://dnsnetworks.com/blog/posts/real-time-updates-with-server-sent-events-sse-in-next-js-and-mongodb)
  - [SSE vs WebSocket](https://dev.to/brinobruno/real-time-web-communication-longshort-polling-websockets-and-sse-explained-nextjs-code-1l43)
- **Findings**:
  - SSEは単方向通信で軽量、既存HTTPインフラで動作
  - WebSocketより実装がシンプルで、ファイアウォール対応が容易
  - 既存のポーリング方式（generate-video-callback）と共存可能
- **Implications**: SSEをメイン画面→リモートパネルの状態通知に使用し、操作コマンドは通常のPOST APIで送信

### 既存コードベース分析
- **Context**: 拡張ポイントと既存パターンの把握
- **Sources Consulted**: `app/page.tsx`, `app/api/` ディレクトリ
- **Findings**:
  - 状態管理: React useState/useCallback/useEffect パターン
  - 動画生成状態: ポーリングベース（1秒間隔）
  - 設定取得: `/api/settings/control-buttons` からJSON取得
  - コンポーネント: VideoPlayer, ChatInput, ChatHistory, ScriptPanel が分離
- **Implications**: 新規ページ `/remote` を追加し、共有状態をAPIで中継

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| SSE + REST | SSEで状態プッシュ、RESTで操作 | シンプル、既存インフラ活用 | SSE接続管理が必要 | **採用** |
| WebSocket | 双方向リアルタイム通信 | 低レイテンシ | 複雑な実装、新規依存 | 過剰 |
| ポーリングのみ | 既存方式を拡張 | 実装簡単 | 遅延大（最大1秒） | 次善策 |

## Design Decisions

### Decision: 状態同期にSSEを採用
- **Context**: リモートパネルがメイン画面の状態をリアルタイムで把握する必要
- **Alternatives Considered**:
  1. WebSocket — 双方向通信だが過剰な機能
  2. ポーリング — 実装簡単だが遅延が大きい
  3. SSE — 単方向プッシュで軽量
- **Selected Approach**: SSE + REST API の組み合わせ
- **Rationale**:
  - メイン画面→リモート: SSEで状態プッシュ（接続、再生状態など）
  - リモート→メイン画面: REST APIでコマンド送信
  - 既存のポーリング方式と干渉しない
- **Trade-offs**: SSE接続管理の複雑さ vs リアルタイム性
- **Follow-up**: SSE再接続ロジックのテスト

### Decision: 共有状態をサーバーサイドで管理
- **Context**: 複数クライアント間で状態を同期
- **Alternatives Considered**:
  1. LocalStorage + BroadcastChannel — 同一ブラウザ限定
  2. サーバーサイドMap — プロセス内で共有
  3. Redis — スケーラブルだが過剰
- **Selected Approach**: サーバーサイドのインメモリMap（既存パターン踏襲）
- **Rationale**: 単一サーバー前提、既存の `videoQueue` パターンと統一
- **Trade-offs**: サーバー再起動で状態リセット vs 実装の簡潔さ

## Risks & Mitigations
- SSE接続断 — 自動再接続ロジックを実装
- メモリリーク — 古い接続を定期的にクリーンアップ
- 同時接続過多 — 接続数に上限を設ける（将来的に）

## References
- [SSE in Next.js](https://dnsnetworks.com/blog/posts/real-time-updates-with-server-sent-events-sse-in-next-js-and-mongodb)
- [Real-Time Web Communication](https://dev.to/brinobruno/real-time-web-communication-longshort-polling-websockets-and-sse-explained-nextjs-code-1l43)
- [Upstash SSE Streaming](https://upstash.com/blog/sse-streaming-llm-responses)
