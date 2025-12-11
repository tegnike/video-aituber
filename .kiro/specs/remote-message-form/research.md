# Research & Design Decisions

## Summary
- **Feature**: `remote-message-form`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存の`RemoteCommand`型に`sendMessage`コマンドを追加するだけで実装可能
  - `useMainScreenSync`に`onSendMessage`コールバックを追加することで、メイン画面との連携が可能
  - localStorageを使用したパネル表示状態の永続化パターンが必要

## Research Log

### 既存コマンドシステムの分析
- **Context**: リモートからメッセージを送信する方法の調査
- **Sources Consulted**: `lib/remoteState.ts`, `hooks/useRemoteSync.ts`, `hooks/useMainScreenSync.ts`
- **Findings**:
  - `RemoteCommand`型は判別共用体（discriminated union）で定義
  - `sendCommand`は`/api/remote/command`へPOST送信
  - メイン画面は`useMainScreenSync`で500msポーリングでコマンドを受信
  - `sendScript`コマンドが既に存在し、同様のパターンで`sendMessage`を追加可能
- **Implications**: 新しいコマンド型を追加し、既存のフローに統合するだけで実装可能

### メイン画面のメッセージ処理
- **Context**: リモートからのメッセージをどのようにチャットフローに渡すか
- **Sources Consulted**: `app/page.tsx` - `handleSendMessage`, `handleOneCommeComment`
- **Findings**:
  - `handleSendMessage`は内部でusernameを「マスター」固定で使用
  - `handleOneCommeComment`はname付きでメッセージを処理（参考パターン）
  - `/api/chat`は`sessionId`, `username`, `comment`を受け取る
  - 新しいハンドラを追加し、usernameを動的に指定可能にする
- **Implications**: `onSendMessage`コールバックに`message`と`username`を渡す設計が適切

### パネル表示状態の永続化
- **Context**: パネル表示切り替え状態をページリロード後も保持する方法
- **Sources Consulted**: 一般的なReactパターン
- **Findings**:
  - localStorageを使用した状態永続化が標準的
  - キー名として`remote-panel-visibility`を使用
  - useEffectでの初期読み込みとuseCallbackでの保存が適切
- **Implications**: カスタムフックまたはコンポーネント内で直接実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン拡張 | RemoteCommandに新型追加 | 一貫性維持、既存テスト流用可能 | なし | 採用 |
| 新規API作成 | /api/remote/message専用エンドポイント | 分離された責務 | 既存パターンから乖離、重複 | 不採用 |

## Design Decisions

### Decision: sendMessageコマンドの追加
- **Context**: リモートからメイン画面へメッセージを送信する方法
- **Alternatives Considered**:
  1. 既存RemoteCommandに新型追加
  2. 専用APIエンドポイント作成
- **Selected Approach**: 既存RemoteCommandに`sendMessage`型を追加
- **Rationale**: 既存の`sendScript`と同様のパターンで一貫性を維持
- **Trade-offs**: 単一のコマンドキューに複数種類が混在するが、型安全で管理可能
- **Follow-up**: 型定義の追加後、テストで動作確認

### Decision: パネル表示切り替えUI
- **Context**: 3つのパネル（台本、自動送信、メッセージフォーム）の表示切り替え
- **Alternatives Considered**:
  1. トグルボタン方式（各パネルに表示/非表示ボタン）
  2. タブ方式（一度に1つのパネルのみ表示）
  3. アコーディオン方式（折りたたみ可能）
- **Selected Approach**: トグルボタン方式
- **Rationale**: 複数パネルを同時に表示可能で柔軟性が高い。既存UIパターンとの一貫性
- **Trade-offs**: 画面スペースを多く使用する可能性
- **Follow-up**: 最低1つのパネルを常に表示する制約を実装

### Decision: ユーザー名の永続化
- **Context**: 入力したユーザー名を次回送信時に再利用
- **Selected Approach**: localStorageでの永続化
- **Rationale**: セッション跨ぎでの値保持、シンプルな実装
- **Trade-offs**: ブラウザ間では共有されない

## Risks & Mitigations
- **Risk 1**: パネル表示状態の不整合 — localStorageとReact stateの同期を初回レンダリング時に行う
- **Risk 2**: 空メッセージ送信 — フォーム送信前にバリデーション
- **Risk 3**: 日本語入力確定中のEnter送信 — `isComposing`チェックで防止

## References
- `lib/remoteState.ts` — 既存コマンド型定義
- `hooks/useMainScreenSync.ts` — メイン画面側コマンド受信
- `app/page.tsx:368-428` — handleSendMessage実装パターン
