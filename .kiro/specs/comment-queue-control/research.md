# Research & Design Decisions

## Summary
- **Feature**: comment-queue-control
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存の `useOneComme` フックが `onComment` コールバックで即座にLLM送信を実行
  - リモート操作パネル（`/remote`）に新しいUIパネルを追加可能
  - `remoteState.ts` の `RemoteCommand` に新しいコマンド型を追加して連携

## Research Log

### 既存のわんコメ連携実装
- **Context**: 現在のコメント処理フローを理解し、変更点を特定
- **Sources Consulted**: `hooks/useOneComme.ts`, `app/page.tsx`
- **Findings**:
  - `useOneComme` の `onComment` コールバックがコメント受信時に呼ばれる
  - `app/page.tsx` の `handleOneCommeComment` がLLM送信を即座に実行
  - コメントはメイン画面の `messages` 配列に追加され、`ChatHistory` に表示される
- **Implications**:
  - `onComment` でLLM送信を行わず、キューに追加するモードが必要
  - メイン画面の表示は既存のまま維持可能

### リモート操作パネルの拡張ポイント
- **Context**: コメントキューUIをどこに配置するか
- **Sources Consulted**: `app/remote/page.tsx`, `lib/remoteState.ts`
- **Findings**:
  - リモートページは3カラムグリッドレイアウト
  - `useRemoteSync` フックで状態同期とコマンド送信
  - `RemoteCommand` 型に新しいコマンドを追加してメイン画面と連携
- **Implications**:
  - 新しい `CommentQueuePanel` コンポーネントをリモートページに追加
  - コメントキュー状態をメイン画面からリモートに同期

### コメント状態の管理方式
- **Context**: コメントの送信状態をどう管理するか
- **Sources Consulted**: `lib/remoteState.ts`, `app/page.tsx`
- **Findings**:
  - 現在の `AppState` にはコメントキュー関連のフィールドがない
  - メイン画面側でコメントキューを管理し、リモートに同期する方式が適切
  - SSE経由で状態変更をリモートに通知
- **Implications**:
  - `AppState` にコメントキュー状態を追加
  - 新しいコマンド `sendQueuedComment` を追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| メイン画面でキュー管理 | メイン画面でコメントキューを保持し、リモートに同期 | 既存パターンと一致、状態の一元管理 | 状態同期の遅延 | 採用 |
| サーバー側でキュー管理 | API Routeでキューを保持 | 複数クライアント対応 | 複雑性増加、既存パターンから逸脱 | 不採用 |

## Design Decisions

### Decision: コメントキューの管理場所
- **Context**: コメントをキューイングする場所をどこにするか
- **Alternatives Considered**:
  1. メイン画面（`app/page.tsx`）でキュー管理
  2. サーバー側（API Route）でキュー管理
- **Selected Approach**: メイン画面でキュー管理
- **Rationale**: 既存のリモート操作パターン（メイン画面が状態を持ち、リモートに同期）と一致
- **Trade-offs**: 複数のリモートクライアントがある場合、最初に接続したクライアントのみが同期される（現状の制約と同じ）
- **Follow-up**: 将来的にサーバー側キューが必要になった場合は別specで対応

### Decision: コメント表示の分離
- **Context**: メイン画面とコントロールパネルでコメント表示をどう分けるか
- **Alternatives Considered**:
  1. メイン画面は全コメント表示、コントロールパネルは未送信のみ
  2. 両方で同じコメントを表示
- **Selected Approach**: メイン画面は全コメント表示（送信状態非表示）、コントロールパネルは未送信+送信済みを区別表示
- **Rationale**: 要件通り、視聴者には送信状態を見せない
- **Trade-offs**: メイン画面のChatHistoryコンポーネントは変更不要

## Risks & Mitigations
- **大量コメント時のパフォーマンス** — キューの最大件数を設定し、古いコメントを自動削除
- **状態同期の遅延** — SSEは既存実装で実績あり、問題なし
- **ワンクリック操作のミスクリック** — 送信済みはボタン非活性で重複送信を防止

## References
- `hooks/useOneComme.ts` — わんコメ連携の既存実装
- `lib/remoteState.ts` — リモート状態管理の既存実装
- `app/remote/page.tsx` — リモート操作パネルの既存実装
