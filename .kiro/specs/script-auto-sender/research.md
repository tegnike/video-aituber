# Research & Design Decisions

## Summary
- **Feature**: `script-auto-sender`
- **Discovery Scope**: Extension（既存ScriptPanel機能の拡張）
- **Key Findings**:
  - 既存の `onScriptSend` / `isSending` インターフェースを再利用可能
  - ブラウザFile APIでクライアントサイドファイル読み込みが適切
  - React Hooksベースの状態機械パターンが既存コードと整合

## Research Log

### 既存台本機能の構造分析
- **Context**: 拡張対象の既存コードパターンを把握
- **Sources Consulted**: `components/ScriptPanel.tsx`, `lib/scriptTypes.ts`, `app/remote/page.tsx`
- **Findings**:
  - `ScriptPanel`は `onScriptSend: (script: Script) => Promise<void>` と `isSending?: boolean` をpropsとして受け取る
  - `Script`型は `id`, `label`, `text`, `emotion?`, `params?` で構成
  - 台本送信完了の検知は `isSending` のfalse遷移で判定可能
  - remoteページとmainページの両方で使用されている
- **Implications**: 新コンポーネントも同じpropsインターフェースを採用し、親コンポーネントとの統合を容易にする

### ファイル読み込み方式の検討
- **Context**: シーケンスファイルをどこで読み込むか
- **Sources Consulted**: ブラウザFile API仕様、既存の設定ファイル読み込みパターン
- **Findings**:
  - サーバーサイド（API Route）: 設定ファイルの事前配置が必要、動的なファイル選択に不向き
  - クライアントサイド（File API）: ユーザーが任意のファイルを選択可能、UIとの親和性が高い
  - 既存の `/api/scripts` は固定パス `config/scripts.json` を読み込む設計
- **Implications**: 動的なファイル選択要件から、クライアントサイドFile APIを採用

### 自動送信の状態管理パターン
- **Context**: 開始/一時停止/再開/停止の状態遷移をどう管理するか
- **Sources Consulted**: 既存Hooksパターン、React状態管理ベストプラクティス
- **Findings**:
  - 既存コードは `useState` + `useCallback` パターンを採用
  - 状態機械として `idle` → `running` ⇔ `paused` → `idle` の遷移が必要
  - タイマー処理には `useEffect` + cleanup関数が適切
- **Implications**: カスタムHook `useScriptAutoSender` で状態機械ロジックをカプセル化

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 単一コンポーネント | ScriptAutoSenderPanel一体型 | 実装がシンプル | ロジックとUIが密結合、テスト困難 | |
| Hook + Component分離 | useScriptAutoSender + ScriptAutoSenderPanel | ロジックのテスト容易、再利用可能 | ファイル数増加 | **選択** |
| Context Provider | グローバル状態として管理 | 複数コンポーネントから参照可能 | オーバーエンジニアリング | 現要件には過剰 |

## Design Decisions

### Decision: クライアントサイドFile APIの採用
- **Context**: ユーザーが配信中に任意の台本シーケンスファイルを選択したい
- **Alternatives Considered**:
  1. サーバーサイドAPI — configディレクトリにファイルを事前配置
  2. クライアントサイドFile API — ブラウザのファイル選択ダイアログを使用
- **Selected Approach**: クライアントサイドFile API
- **Rationale**: 動的なファイル選択が可能で、サーバー設定変更なしに即座に新しいシーケンスを使用できる
- **Trade-offs**: サーバーでのファイル管理機能がない、ブラウザ互換性に依存
- **Follow-up**: File APIの対応ブラウザ範囲を確認（モダンブラウザでは問題なし）

### Decision: Hook + Component分離パターン
- **Context**: 自動送信の状態管理ロジックをどう構成するか
- **Alternatives Considered**:
  1. 単一コンポーネント内で全て管理
  2. カスタムHookでロジック分離
- **Selected Approach**: `useScriptAutoSender` カスタムHookを作成
- **Rationale**: ロジックのユニットテストが容易、既存の `useOneComme` 等と同じパターン
- **Trade-offs**: ファイル数が1つ増加
- **Follow-up**: Hookのテストケース作成

### Decision: 送信間隔の待機方式
- **Context**: 各台本送信後の待機をどう実装するか
- **Alternatives Considered**:
  1. 固定タイマー（setTimeoutのみ）
  2. isSending監視 + 追加インターバル
- **Selected Approach**: `isSending` がfalseになるのを待機 → 設定間隔を追加で待機
- **Rationale**: 送信完了を確実に検知してから次へ進むことで、動画生成等の非同期処理完了を待てる
- **Trade-offs**: `isSending` の状態変化に依存するため、親コンポーネントの実装品質に影響される
- **Follow-up**: 送信完了検知のタイムアウト処理を検討

## Risks & Mitigations
- **Risk 1**: `isSending` が意図せずtrueのまま固まる → タイムアウト検知と手動停止UIで対応
- **Risk 2**: 大量の台本で画面が見づらくなる → シーケンスリストのスクロール表示とプレビュー件数制限
- **Risk 3**: ファイル形式の不一致 → バリデーションエラーの明示と形式サンプルの提供

## References
- [MDN Web Docs - File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- 既存パターン: `components/ScriptPanel.tsx`, `hooks/useOneComme.ts`
