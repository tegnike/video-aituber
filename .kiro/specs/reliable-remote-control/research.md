# Research & Design Decisions

## Summary
- **Feature**: `reliable-remote-control`
- **Discovery Scope**: Extension（既存システムの通信方式改善）
- **Key Findings**:
  - 現在のSSEベース通信は接続維持が不安定で、コマンドが失われることがある
  - ポーリング+コマンドキュー方式は単純だが信頼性が高い
  - 既存のAPIエンドポイント構造は維持し、内部実装のみ変更可能

## Research Log

### SSE通信の問題分析
- **Context**: リモートパネルからの指示がメイン画面に伝わらない問題
- **Sources Consulted**: 既存コード（`/app/api/remote/events/route.ts`, `/hooks/useRemoteSync.ts`）
- **Findings**:
  - SSEはReadableStreamを使用しており、接続が切れるとコマンドが失われる
  - 再接続時に未処理コマンドを復元する仕組みがない
  - `broadcastCommand`はメモリ上のSubscriberにのみ配信、永続化なし
- **Implications**: コマンドの永続化と取得確認が必要

### ポーリング方式の適合性
- **Context**: ローカル環境での確実な通信方式の検討
- **Sources Consulted**: 既存の`/api/remote/state`エンドポイント（GET/POST実装済み）
- **Findings**:
  - 状態取得（GET）は既に実装済み
  - 500ms〜1秒のポーリング間隔はローカル環境で十分
  - Next.js API Routesのインメモリ状態管理との相性が良い
- **Implications**: SSE削除後、既存パターンを拡張してコマンドキューを追加

### 既存コード修正範囲
- **Context**: 最小限の変更で信頼性を向上させる
- **Sources Consulted**: プロジェクト構造、既存ファイル
- **Findings**:
  - 修正対象: `lib/remoteState.ts`, `hooks/useRemoteSync.ts`, `hooks/useMainScreenSync.ts`
  - 削除対象: `app/api/remote/events/route.ts`（SSEエンドポイント）
  - 新規追加: `app/api/remote/commands/route.ts`（コマンドキュー取得用）
  - UI側（`app/remote/page.tsx`, `app/page.tsx`）は変更不要（フックが抽象化）
- **Implications**: フック内部の実装変更で対応可能、UIには影響なし

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| SSE維持+再接続強化 | 既存SSEを改善 | 変更量少 | 根本解決にならない | 不採用 |
| ポーリング+キュー | 定期的にコマンドを取得 | シンプル、確実 | 遅延あり（最大1秒） | 採用 |
| WebSocket | 双方向リアルタイム通信 | 高速 | 実装複雑、オーバースペック | 不採用 |

## Design Decisions

### Decision: SSEからポーリング方式への移行
- **Context**: SSEベースの通信が不安定で、コマンドが失われる問題
- **Alternatives Considered**:
  1. SSE再接続ロジックの強化 — 複雑化し、根本解決にならない
  2. ポーリング+コマンドキュー — シンプルで確実
  3. WebSocket導入 — オーバースペック
- **Selected Approach**: ポーリング+コマンドキュー方式
- **Rationale**:
  - ローカル環境限定なので遅延は許容
  - 既存の状態取得パターン（`/api/remote/state` GET）を踏襲
  - コマンドキューで取りこぼしを防止
- **Trade-offs**:
  - リアルタイム性は低下（最大500ms〜1秒の遅延）
  - ポーリングによるリクエスト数増加（ローカルなので問題なし）
- **Follow-up**: 実装後に遅延が問題になれば間隔調整

### Decision: コマンドキューのインメモリ管理
- **Context**: コマンドの確実な配信を保証する仕組み
- **Alternatives Considered**:
  1. ファイル永続化 — 過剰
  2. インメモリ配列 — シンプルで十分
- **Selected Approach**: インメモリ配列によるFIFOキュー
- **Rationale**: ローカル環境でサーバー再起動は稀、シンプルさ優先
- **Trade-offs**: サーバー再起動でキューがクリアされる（許容）
- **Follow-up**: なし

## Risks & Mitigations
- ポーリング間隔が長すぎると操作感が悪化 — 500msを基本とし、必要に応じて調整
- コマンドキューが溜まりすぎる — 最大100件に制限、古いものから削除
- サーバー再起動でキュー消失 — ローカル環境では許容、必要なら再操作

## References
- 既存実装: `/app/api/remote/` ディレクトリ
- Next.js API Routes: https://nextjs.org/docs/app/api-reference/file-conventions/route
