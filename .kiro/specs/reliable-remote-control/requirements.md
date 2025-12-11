# Requirements Document

## Project Description (Input)
リモート操作パネルからの指示がメイン画面に伝わらないことが多い、ローカルでしか使用しないので、セキュリティなどは一旦置いておいて良いので必ず動くシステムにして欲しい、実装もシンプルで良い

## Introduction
現在のリモート操作パネルはSSE（Server-Sent Events）ベースの通信を使用しているが、指示がメイン画面に伝わらないことが頻発している。本仕様では、ローカル環境での使用に特化し、シンプルで確実に動作する通信方式に改善する。

## Requirements

### Requirement 1: シンプルなポーリング方式への移行
**Objective:** As a 配信者, I want リモートパネルからの指示が確実にメイン画面に届くようにしたい, so that 配信中にコントロールが効かなくなる問題を解消できる

#### Acceptance Criteria
1. The リモート操作システム shall SSEの代わりにポーリング方式でコマンドを取得する
2. When リモートパネルがコマンドを送信したとき, the メイン画面 shall 1秒以内にそのコマンドを受信する
3. The コマンドキュー shall 未処理のコマンドを順番通りに保持する
4. When メイン画面がコマンドを取得したとき, the コマンドキュー shall そのコマンドを削除する

### Requirement 2: コマンドキューによる確実な配信
**Objective:** As a 配信者, I want 送信したコマンドが確実に実行されることを保証したい, so that 操作の取りこぼしを防げる

#### Acceptance Criteria
1. The サーバー shall コマンドを受信したらキューに追加する
2. The メイン画面 shall ポーリングでキューからコマンドを取得して実行する
3. When コマンドが正常に取得されたとき, the サーバー shall そのコマンドをキューから削除する
4. The コマンドキュー shall FIFO（先入先出）順序を保証する

### Requirement 3: 状態同期のシンプル化
**Objective:** As a 配信者, I want リモートパネルでメイン画面の状態を確認したい, so that 現在の状況を把握しながら操作できる

#### Acceptance Criteria
1. The メイン画面 shall 状態変更時にサーバーに報告する
2. The リモートパネル shall ポーリングで最新の状態を取得する
3. When 状態取得に失敗したとき, the リモートパネル shall 次のポーリングで再試行する
4. The 状態取得 shall 500ms間隔でポーリングする

### Requirement 4: エラー時のフォールバック
**Objective:** As a 配信者, I want 通信エラーが起きても復旧できるようにしたい, so that 配信中に操作不能にならない

#### Acceptance Criteria
1. If コマンド送信に失敗したとき, then the リモートパネル shall 自動的に再送信を試みる
2. If ポーリングに失敗したとき, then the メイン画面 shall 次の間隔で再試行する
3. The システム shall エラー時でもUIをブロックしない
4. When 接続が回復したとき, the システム shall 通常動作に復帰する

### Requirement 5: 既存機能の維持
**Objective:** As a 配信者, I want 既存のコントロール機能が全て動作し続けることを保証したい, so that 現在の運用フローを変えずに使える

#### Acceptance Criteria
1. The システム shall 画面モード切り替え（standby/room）を維持する
2. The システム shall コントロールビデオ再生（start/end）を維持する
3. The システム shall わんコメ連携のON/OFF切り替えを維持する
4. The システム shall 台本送信機能を維持する
5. The システム shall UI表示切り替え（controls/chatHistory/chatInput）を維持する
