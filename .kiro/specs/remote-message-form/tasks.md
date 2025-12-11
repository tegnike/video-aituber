# Implementation Plan

## Tasks

- [x] 1. sendMessageコマンドの型定義とAPI対応
- [x] 1.1 RemoteCommand型にsendMessageを追加
  - `lib/remoteState.ts`でRemoteCommand判別共用体に`sendMessage`型を追加
  - messageフィールド（文字列）とusernameフィールド（文字列）を含む
  - _Requirements: 4.2_
- [x] 1.2 コマンドAPIでsendMessage型のバリデーションを追加
  - `/api/remote/command/route.ts`のisValidCommand関数でsendMessage型を認識
  - message・usernameフィールドの存在チェック
  - _Requirements: 4.2_

- [x] 2. メイン画面でのメッセージ受信処理
- [x] 2.1 useMainScreenSyncにonSendMessageコールバックを追加
  - UseMainScreenSyncOptionsインターフェースにonSendMessage追加
  - handleCommand内でcase 'sendMessage'を処理
  - コールバックにmessageとusernameを渡す
  - _Requirements: 4.1_
- [x] 2.2 メイン画面でリモートからのメッセージを処理
  - `app/page.tsx`にhandleRemoteSendMessage関数を追加
  - 既存のhandleSendMessageと同様にチャットAPIを呼び出し
  - usernameを動的に指定してメッセージを送信
  - useMainScreenSyncのonSendMessageにハンドラを接続
  - _Requirements: 4.1_

- [x] 3. MessageFormPanelコンポーネントの作成
- [x] 3.1 (P) メッセージ入力フォームUIを実装
  - メッセージ入力テキストフィールドを追加
  - ユーザー名入力テキストフィールドを追加
  - 送信ボタンを追加（既存ScriptPanelと同様のスタイリング）
  - _Requirements: 1.1, 2.1_
- [x] 3.2 フォーム送信ロジックを実装
  - 送信ボタンクリックでonMessageSendコールバックを呼び出し
  - Enterキー押下でフォーム送信（日本語入力確定中は除外）
  - メッセージが空の場合は送信ボタンを無効化
  - 送信中はボタンを無効化し、ローディング状態を表示
  - 送信成功後はメッセージフィールドをクリア
  - _Requirements: 1.2, 1.3, 1.4, 1.5_
- [x] 3.3 ユーザー名の永続化を実装
  - localStorageからユーザー名を初期読み込み
  - ユーザー名変更時にlocalStorageへ保存
  - ユーザー名が空の場合はデフォルト値「配信者」を使用
  - _Requirements: 2.2, 2.3, 2.4_
- [x] 3.4 エラーハンドリングを実装
  - 送信失敗時にエラーメッセージを表示
  - エラー状態でも再送信可能にする
  - _Requirements: 4.3_

- [x] 4. パネル表示切り替え機能
- [x] 4.1 (P) パネル表示状態の管理を実装
  - PanelVisibility状態（script, autoSender, messageForm）を追加
  - localStorageから初期状態を読み込み
  - 状態変更時にlocalStorageへ保存
  - _Requirements: 3.3_
- [x] 4.2 パネル表示切り替えUIを実装
  - 各パネルの表示/非表示を切り替えるトグルボタンを追加
  - ボタンクリックで対象パネルの表示状態をトグル
  - 全パネル非表示を防ぐ制約（最後の1つは非表示不可）
  - _Requirements: 3.1, 3.2, 3.4_
- [x] 4.3 パネル表示状態に基づくレンダリング
  - ScriptPanelの表示/非表示をpanelVisibility.scriptで制御
  - ScriptAutoSenderPanelの表示/非表示をpanelVisibility.autoSenderで制御
  - MessageFormPanelの表示/非表示をpanelVisibility.messageFormで制御
  - _Requirements: 3.1, 3.2_

- [x] 5. リモート画面への統合
- [x] 5.1 RemoteControlPageにMessageFormPanelを統合
  - MessageFormPanelをインポートしてレンダリング
  - メッセージ送信ハンドラを実装（sendCommand呼び出し）
  - isSending状態の管理を追加
  - _Requirements: 1.2, 2.4_

- [x]*6. テストの追加
- [x]*6.1 (P) MessageFormPanelのユニットテスト
  - 空メッセージ時のボタン無効化をテスト
  - Enter送信（日本語入力確定中除外）をテスト
  - ユーザー名のlocalStorage永続化をテスト
  - _Requirements: 1.3, 1.5, 2.2_
- [x]*6.2 (P) パネル表示切り替えのテスト
  - 表示状態のトグル動作をテスト
  - 最後の1パネルが非表示にできないことをテスト
  - localStorageへの永続化をテスト
  - _Requirements: 3.2, 3.3, 3.4_
