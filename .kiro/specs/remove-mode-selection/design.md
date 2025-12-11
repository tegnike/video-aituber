# Design Document: remove-mode-selection

## Overview
**Purpose**: アプリ起動時の画面モード選択画面を削除し、初回アクセスから直接待機画面を表示することで、配信開始までのステップを1つ削減する。

**Users**: 配信者がアプリを開いた直後から待機画面が表示され、すぐに配信準備に入れる。

**Impact**: `app/page.tsx`の初期状態と条件分岐UIを変更。既存のリモート操作機能との互換性は維持する。

### Goals
- アプリ起動時に自動的に待機画面（standbyモード）を表示
- 画面モード選択UIを削除してコードを簡略化
- リモートパネルからのモード切り替え機能を維持

### Non-Goals
- `room`モードの完全削除（リモートからの切り替え用に維持）
- 設定ファイル（`control-buttons.json`）の変更
- リモートパネル側のUI変更

## Architecture

### Existing Architecture Analysis
- **現在の構造**: `app/page.tsx`内で`hasStarted`と`screenMode`の状態により画面を切り替え
- **維持する統合ポイント**:
  - `useMainScreenSync`フックによるリモートコマンド受信
  - `reportState`による状態報告
  - `AppState`インターフェースの構造
- **対処する技術的負債**: 不要な画面モード選択UI

### Architecture Pattern & Boundary Map

変更は`app/page.tsx`内に閉じており、アーキテクチャパターンの変更なし。

**Architecture Integration**:
- Selected pattern: 既存のReact Hooks状態管理パターンを維持
- Domain/feature boundaries: メイン画面コンポーネント内のみ
- Existing patterns preserved: SSE同期、状態報告、コールバックパターン
- New components rationale: 新規コンポーネントなし
- Steering compliance: Next.js App Router標準構成を維持

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend | React 19, Next.js 16 | 状態管理、条件分岐UI | 既存技術スタック |

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | 自動的にstandbyモード設定 | Home | - | 初期化フロー |
| 1.2 | 背景動画読み込み開始 | Home | fetchBackgroundVideos | 初期化フロー |
| 1.3 | モード選択UI非表示 | Home | - | - |
| 2.1 | hasStarted初期値true | Home | - | - |
| 2.2 | screenMode初期値standby | Home | - | - |
| 2.3 | コントロールボタン維持 | Home | - | - |
| 2.4 | わんコメ連携維持 | Home | - | - |
| 3.1 | 選択画面JSX削除 | Home | - | - |
| 3.2 | handleScreenModeSelect簡略化 | Home | handleScreenModeSelect | - |
| 3.3 | roomモード設定読み込み維持 | Home | - | - |
| 3.4 | hasStarted条件分岐維持 | Home | - | - |
| 4.1 | reportState維持 | Home | reportState | - |
| 4.2 | UI表示切替維持 | Home | onUIVisibilityChange | - |
| 4.3 | selectModeコマンド維持 | Home | handleRemoteSelectMode | - |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| Home | UI/Page | メイン画面 | 1.1-4.3 | useMainScreenSync (P0) | State |

### UI Layer

#### Home (app/page.tsx)

| Field | Detail |
|-------|--------|
| Intent | メイン画面の初期状態変更と不要UIの削除 |
| Requirements | 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3 |

**Responsibilities & Constraints**
- 初期状態で`hasStarted=true`、`screenMode='standby'`を設定
- 設定読み込み後に背景動画を取得開始
- リモートからのモード切り替えコマンドに対応

**Dependencies**
- Inbound: useMainScreenSync — リモートコマンド受信 (P0)
- Outbound: /api/generate-video — 背景動画取得 (P0)
- Outbound: /api/remote/state — 状態報告 (P1)

**Contracts**: State [x]

##### State Management

**変更前の状態初期値**:
```typescript
const [hasStarted, setHasStarted] = useState(false);
const [screenMode, setScreenMode] = useState<ScreenMode | null>(null);
```

**変更後の状態初期値**:
```typescript
const [hasStarted, setHasStarted] = useState(true);
const [screenMode, setScreenMode] = useState<ScreenMode>('standby');
```

**handleScreenModeSelect変更**:
```typescript
// 変更前
const handleScreenModeSelect = useCallback((mode: ScreenMode) => {
  setScreenMode(mode);
  setHasStarted(true);
  // ... 背景動画取得
}, [fetchBackgroundVideos, appConfig]);

// 変更後
const handleScreenModeSelect = useCallback((mode: ScreenMode) => {
  setScreenMode(mode);
  // setHasStarted削除（常にtrue）
  // ... 背景動画取得
}, [fetchBackgroundVideos, appConfig]);
```

**Implementation Notes**
- Integration: 設定読み込み後のuseEffectで初期背景動画取得を追加
- Validation: リモートからのselectModeコマンドが正常に動作することを確認
- Risks: 初期マウント時に設定未読み込み状態で動画取得が始まる可能性 → appConfig依存のuseEffectで対応

## Data Models

### State Model Changes

**ScreenMode型**: 変更なし（`'standby' | 'room'`を維持）

**AppState.screenMode**: `null`を許容しなくなる可能性があるが、リモート互換性のため現状維持

## Error Handling

### Error Strategy
既存のエラーハンドリングを維持。初期化時のエラーは既存のリトライロジック（5秒ごと）で対応。

## Testing Strategy

### Unit Tests
- `hasStarted`初期値が`true`であること
- `screenMode`初期値が`'standby'`であること
- `handleScreenModeSelect`がリモートコマンドで正常動作すること

### Integration Tests
- アプリ起動時に背景動画取得APIが呼ばれること
- リモートからの`selectMode`コマンドで画面モードが切り替わること
- 状態報告が正しいフォーマットで送信されること

### E2E Tests
- アプリアクセス時に待機画面が直接表示されること
- コントロールボタン（開始/終了）が動作すること
- わんコメ連携が有効化できること
