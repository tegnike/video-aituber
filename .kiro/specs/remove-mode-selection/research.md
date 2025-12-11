# Research & Design Decisions

## Summary
- **Feature**: `remove-mode-selection`
- **Discovery Scope**: Simple Addition（既存コードの削除・簡略化）
- **Key Findings**:
  - 画面モード選択は`app/page.tsx`内の単一コンポーネントで完結
  - リモート操作との互換性を維持するため`selectMode`コマンドのハンドラは残す必要あり
  - `hasStarted`と`screenMode`の状態変数は他の機能で参照されているため削除不可

## Research Log

### 既存の状態管理構造
- **Context**: 画面モード選択に関連する状態変数の依存関係を調査
- **Sources Consulted**: `app/page.tsx`, `lib/remoteState.ts`, `hooks/useMainScreenSync.ts`
- **Findings**:
  - `hasStarted`: ポーリング開始条件（L330）、わんコメ有効化条件（L481）で使用
  - `screenMode`: エラー時のリトライロジック（L339-352）、状態報告（L530）で使用
  - `handleScreenModeSelect`: リモートからの`selectMode`コマンドで呼び出される（L489）
- **Implications**: 状態変数は維持し、初期値を変更するアプローチが最適

### リモート操作との統合
- **Context**: リモートパネルからの画面モード切り替え機能の互換性確認
- **Sources Consulted**: `hooks/useMainScreenSync.ts`, `lib/remoteState.ts`
- **Findings**:
  - `onSelectMode`コールバックは`useMainScreenSync`フックで定義（L13）
  - `selectMode`コマンド（L76）はstandby/roomの切り替えに使用
  - `AppState`インターフェースに`hasStarted`と`screenMode`が含まれる
- **Implications**: リモートからのモード切り替え機能は維持する必要がある

### 削除対象コードの特定
- **Context**: 不要になるコードの範囲を特定
- **Sources Consulted**: `app/page.tsx`
- **Findings**:
  - 画面モード選択UI: L618-636（JSX条件分岐`!hasStarted`）
  - `ScreenMode`型: L25（`'room'`は維持が必要）
  - `handleScreenModeSelect`: リモート用に維持必要だが`setHasStarted`呼び出しは削除可能
  - `screenModes.room`設定: 背景動画切り替え用に維持が必要
- **Implications**: UI削除と初期値変更が主な変更点、機能ロジックは維持

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 初期値変更 | `hasStarted`を`true`、`screenMode`を`'standby'`で初期化 | 最小限の変更、既存ロジックに影響なし | 設定からの初期モード読み込み前に動作する | 採用 |
| useEffect初期化 | useEffectで設定読み込み後に初期化 | 設定との整合性 | 不要な複雑さ | 却下（設定は既にstandbyデフォルト） |

## Design Decisions

### Decision: 初期状態の設定方法
- **Context**: アプリ起動時に自動的に待機画面を表示する必要がある
- **Alternatives Considered**:
  1. useState初期値を変更 — シンプルで同期的
  2. useEffectで設定読み込み後に初期化 — 設定に依存するが複雑
- **Selected Approach**: useState初期値を変更
- **Rationale**: 設定の`loopActions`読み込みは既存の`useEffect`で行われており、初期値変更で十分
- **Trade-offs**: 設定読み込み前のフレームで一瞬ローディングが表示される可能性（既存動作と同じ）
- **Follow-up**: 動画読み込み開始タイミングが正しいか確認

### Decision: リモート操作機能の維持
- **Context**: リモートパネルからの`selectMode`コマンドへの対応
- **Alternatives Considered**:
  1. `handleScreenModeSelect`を完全削除 — リモート機能が壊れる
  2. 関数を維持し、内部ロジックを簡略化 — 互換性維持
- **Selected Approach**: 関数を維持し、`setHasStarted`呼び出しを削除
- **Rationale**: `hasStarted`は常に`true`となるため設定不要
- **Trade-offs**: 使用されないコードパスが残る可能性
- **Follow-up**: リモートからのモード切り替えをテスト

## Risks & Mitigations
- `hasStarted`の初期値を`true`にすることで、マウント前の状態でポーリングが開始される可能性 — useEffect内の条件で防止されている
- 背景動画の読み込みタイミングが変わる可能性 — appConfig読み込み後のuseEffectで対応

## References
- `app/page.tsx` — メイン画面コンポーネント
- `lib/remoteState.ts` — 状態管理とコマンド定義
- `hooks/useMainScreenSync.ts` — リモート同期フック
