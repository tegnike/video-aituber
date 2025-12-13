# Research & Design Decisions

## Summary
- **Feature**: `preset-sequence-sender`
- **Discovery Scope**: Extension（既存の自動送信機能への拡張）
- **Key Findings**:
  - 既存の`useScriptAutoSender`フックは`loadSequence(file: File)`でファイル読み込みを行っており、API経由でのシーケンス取得に対応する拡張が必要
  - `/api/scripts/route.ts`でファイルシステムからJSONを読み込むパターンが確立されている
  - `samples/`フォルダに複数のシーケンスJSONファイルが既に存在

## Research Log

### 既存のシーケンス読み込みパターン
- **Context**: 現在の自動送信機能がどのようにシーケンスを読み込んでいるかを調査
- **Sources Consulted**: `hooks/useScriptAutoSender.ts`, `components/ScriptAutoSenderPanel.tsx`
- **Findings**:
  - `loadSequence`は`File`オブジェクトを受け取り、`file.text()`でテキスト読み込み
  - `parseScriptSequence`でJSON→`ScriptSequence`型へバリデーション付きパース
  - パネルコンポーネントは`<input type="file">`でファイル選択
- **Implications**: 新規に`loadSequenceFromUrl`のような関数を追加してAPI経由の読み込みに対応、または既存の`loadSequence`を拡張

### 既存のAPI設計パターン
- **Context**: このプロジェクトのAPI Route設計パターンを把握
- **Sources Consulted**: `app/api/scripts/route.ts`
- **Findings**:
  - Next.js App RouterのRoute Handler形式
  - `fs`でファイルシステムから読み込み
  - `NextResponse.json()`でJSONレスポンス
  - エラー時も空配列を返して継続動作
- **Implications**: 同様のパターンで`/api/preset-sequences`を実装

### samplesフォルダの構造
- **Context**: プリセットファイルの現在の状態を調査
- **Sources Consulted**: `samples/`フォルダ
- **Findings**:
  - `script-sequence-sample.json`: サンプルシーケンス
  - `script-system-architecture-part*.json`: 複数パートのシーケンス
  - 全てが`ScriptSequence`形式に準拠
- **Implications**: `samples/`をプリセットフォルダとして使用可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Hook拡張方式 | `useScriptAutoSender`に`loadSequenceFromUrl`メソッドを追加 | 既存ロジックの再利用、型安全 | Hook APIの変更が必要 | 採用 |
| 別Hook方式 | プリセット専用の新規Hookを作成 | 既存への影響なし | コード重複 | 不採用 |

## Design Decisions

### Decision: プリセット一覧取得APIの設計
- **Context**: クライアントからプリセットファイル一覧を取得する方法
- **Alternatives Considered**:
  1. 単一エンドポイント `/api/preset-sequences` - 一覧と詳細を同一エンドポイントで
  2. 分離エンドポイント - 一覧と詳細を別エンドポイントで
- **Selected Approach**: 単一エンドポイント方式、クエリパラメータ`?id=filename`で詳細取得
- **Rationale**: シンプルな設計、エンドポイント数の抑制
- **Trade-offs**: 一覧取得と詳細取得の責務が混在
- **Follow-up**: パフォーマンス問題が発生した場合は分離を検討

### Decision: Hookの拡張方式
- **Context**: プリセット選択をどのようにHookに統合するか
- **Alternatives Considered**:
  1. `loadSequence`のオーバーロード
  2. 新規メソッド`loadSequenceFromPreset(id: string)`を追加
- **Selected Approach**: 新規メソッド追加
- **Rationale**: 既存のFile読み込みロジックとの分離、明確な責務
- **Trade-offs**: Hook APIのメソッド増加
- **Follow-up**: なし

## Risks & Mitigations
- ファイルシステムアクセスの権限問題 → Next.jsのサーバーコンポーネント内でのみアクセス
- samplesフォルダの不在 → 空配列を返却、UIで「プリセットがありません」表示
- 大量ファイル時のパフォーマンス → 初期リリースでは考慮せず、必要に応じてキャッシュ導入

## References
- [Next.js App Router - Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- 既存実装: `/api/scripts/route.ts`
