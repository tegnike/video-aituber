# Implementation Plan

## Tasks

- [x] 1. 状態初期値の変更
- [x] 1.1 hasStartedとscreenModeの初期値を変更する
  - `hasStarted`を`true`で初期化
  - `screenMode`を`'standby'`で初期化（型を`ScreenMode`に変更、`null`を許容しない）
  - 既存のポーリング開始条件（`hasStarted`依存）が正常に動作することを確認
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 1.2 設定読み込み後に背景動画を自動取得する
  - `appConfig`読み込み完了後に`fetchBackgroundVideos`を呼び出すuseEffectを追加
  - `loopActions`を使用して待機画面用の背景動画を取得
  - _Requirements: 1.2_

- [x] 2. 不要なUIとコードの削除
- [x] 2.1 (P) 画面モード選択UIを削除する
  - `!hasStarted`条件分岐のJSXブロック（待機画面/初期画面の選択ボタン）を削除
  - 関連するスタイル定義がある場合は併せて削除
  - _Requirements: 1.3, 3.1_

- [x] 2.2 (P) handleScreenModeSelect関数を簡略化する
  - `setHasStarted(true)`呼び出しを削除（常にtrueのため不要）
  - リモートからの`selectMode`コマンド用に関数自体は維持
  - 背景動画取得ロジックは維持（standby/room切り替え対応）
  - _Requirements: 3.2, 4.3_

- [x] 3. 動作確認とテスト
- [x] 3.1 既存機能の動作確認
  - コントロールボタン（開始/終了）が正常に動作すること
  - わんコメ連携のON/OFF切り替えが機能すること
  - 状態報告（`reportState`）が正しいフォーマットで送信されること
  - UI表示切替（controls/chatHistory/chatInput）が機能すること
  - _Requirements: 2.3, 2.4, 3.4, 4.1, 4.2_

- [x] 3.2 リモート操作の互換性テスト
  - リモートパネルから`selectMode`コマンド送信時にモードが切り替わること
  - standby/room間で背景動画が正しく切り替わること
  - _Requirements: 3.3, 4.3_
