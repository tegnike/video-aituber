# Research & Design Decisions

## Summary
- **Feature**: `video-order-fix`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 並列Promise.allによる動画生成で完了順序が不定
  - コールバックキューが到着順で格納するため順序が乱れる
  - ポーリング機構がシーケンス番号を考慮していない

## Research Log

### 現行アーキテクチャの順序問題
- **Context**: 「開始」「終了」ボタンで動画の再生順序がバラバラになる問題の根本原因調査
- **Sources Consulted**: `app/page.tsx`, `app/api/generate-video-callback/route.ts`, `components/VideoPlayer.tsx`
- **Findings**:
  - `fetchControlVideo`で`Promise.all`を使用し複数動画を並列取得（行176-186）
  - 外部APIの処理時間差により完了順序が不定
  - `generate-video-callback`のMapは挿入順を保持するが、到着順がバラバラ
  - ポーリングは1秒間隔で1件ずつ取得、順序を考慮していない
- **Implications**: シーケンス番号による順序管理が必要

### 既存パターン分析
- **Context**: プロジェクトの既存パターンに合わせた設計が必要
- **Sources Consulted**: `.kiro/steering/tech.md`, `.kiro/steering/structure.md`
- **Findings**:
  - TypeScript strict mode、Next.js App Router使用
  - API Routesでバックエンド処理、状態管理はReact Hooks
  - ポーリング方式（WebSocket未使用）が既存パターン
  - ダブルバッファリングで動画切り替え
- **Implications**: 既存のポーリング方式を維持しつつ順序保証を追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| シーケンス番号方式 | リクエスト時にシーケンス番号を付与し、コールバック時に順序を保証 | シンプル、既存構造を大きく変更しない | セッション管理が必要 | 採用 |
| 逐次実行方式 | 動画生成を1件ずつ順番に実行 | 確実に順序が保証される | 総処理時間が長くなる | 不採用：パフォーマンス懸念 |
| バッチ完了待機方式 | 全動画の生成完了を待ってから一括取得 | 順序管理が簡単 | 最初の動画の表示が遅延 | 不採用：UX懸念 |

## Design Decisions

### Decision: シーケンス番号による順序管理
- **Context**: 並列処理のパフォーマンスを維持しつつ順序を保証する必要がある
- **Alternatives Considered**:
  1. 逐次実行方式 — 確実だが遅い
  2. バッチ完了待機方式 — 簡単だがUX劣化
- **Selected Approach**: リクエスト時にセッションIDとシーケンス番号を付与し、コールバック時に順序付きで格納
- **Rationale**: 並列処理のパフォーマンスを維持しつつ、確実な順序保証が可能
- **Trade-offs**: セッション管理のオーバーヘッドが発生するが、許容範囲内
- **Follow-up**: セッションの有効期限とクリーンアップの実装確認

### Decision: セッションベースのキュー管理
- **Context**: 複数の「開始」「終了」操作が混在しないよう分離が必要
- **Selected Approach**: セッションIDでグループ化し、各セッション内でシーケンス番号順に取得
- **Rationale**: 操作単位で独立した順序管理が可能
- **Trade-offs**: メモリ使用量が若干増加

## Risks & Mitigations
- **Risk 1**: セッション管理によるメモリリーク — 1時間経過したセッションを自動削除
- **Risk 2**: 先行シーケンスの動画が到着しない場合のデッドロック — タイムアウト機構を検討
- **Risk 3**: 既存のポーリング機構との互換性 — 後方互換性を維持（セッションIDなしの場合は従来動作）

## References
- JavaScript Map挿入順序保証: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
