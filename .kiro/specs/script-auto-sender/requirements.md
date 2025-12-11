# Requirements Document

## Introduction
本ドキュメントは、台本ファイルを読み込み、ボタン一つで複数の台本を自動的に順次送信する機能の要件を定義します。既存のScriptPanel（単一台本送信）を拡張し、台本シーケンスファイルを使った自動連続送信を実現します。

## Requirements

### Requirement 1: 台本シーケンスファイルの読み込み
**Objective:** As a 配信者, I want あらかじめ作成した台本シーケンスファイルを読み込む機能, so that 複数の台本を事前に準備して配信に利用できる

#### Acceptance Criteria
1. When ユーザーがシーケンスファイルを選択した時, the ScriptAutoSender shall ファイルを読み込みパース結果を表示する
2. The ScriptAutoSender shall JSONまたはテキスト形式の台本シーケンスファイルをサポートする
3. If ファイル形式が不正な場合, then the ScriptAutoSender shall エラーメッセージを表示する
4. When ファイルが正常に読み込まれた時, the ScriptAutoSender shall シーケンス内の台本件数とプレビューを表示する

### Requirement 2: 自動順次送信機能
**Objective:** As a 配信者, I want ボタン一つで台本を自動的に順次送信したい, so that 配信中に手動で一つずつ送信する手間を省ける

#### Acceptance Criteria
1. When ユーザーが開始ボタンをクリックした時, the ScriptAutoSender shall 読み込んだ台本を先頭から順に送信を開始する
2. When 各台本の送信が完了した時, the ScriptAutoSender shall 設定された間隔を待ってから次の台本を送信する
3. While 自動送信中, the ScriptAutoSender shall 現在の送信位置と残り件数を表示する
4. When 全ての台本の送信が完了した時, the ScriptAutoSender shall 完了メッセージを表示し自動送信を終了する

### Requirement 3: 送信制御機能
**Objective:** As a 配信者, I want 自動送信の一時停止・再開・停止ができるようにしたい, so that 配信状況に応じて柔軟に操作できる

#### Acceptance Criteria
1. While 自動送信中, when ユーザーが一時停止ボタンをクリックした時, the ScriptAutoSender shall 送信を一時停止し現在位置を保持する
2. While 一時停止中, when ユーザーが再開ボタンをクリックした時, the ScriptAutoSender shall 停止位置から送信を再開する
3. When ユーザーが停止ボタンをクリックした時, the ScriptAutoSender shall 自動送信を完全に停止しシーケンスを先頭にリセットする
4. While 自動送信中, the ScriptAutoSender shall 開始ボタンを無効化する

### Requirement 4: 送信間隔設定
**Objective:** As a 配信者, I want 台本間の送信間隔を調整したい, so that 動画生成やAI応答の完了を待つ適切なタイミングで次の台本を送信できる

#### Acceptance Criteria
1. The ScriptAutoSender shall 台本間の送信間隔を秒単位で設定できるUIを提供する
2. The ScriptAutoSender shall デフォルトの送信間隔を設定ファイルから読み込む
3. If 送信間隔が0秒未満の場合, then the ScriptAutoSender shall 最小値（0秒）を適用する
4. While 自動送信中, when 送信間隔が変更された時, the ScriptAutoSender shall 次回の送信から新しい間隔を適用する

### Requirement 5: 既存機能との統合
**Objective:** As a 配信者, I want 既存の台本送信機能と併用したい, so that 状況に応じて手動送信と自動送信を使い分けられる

#### Acceptance Criteria
1. The ScriptAutoSender shall 既存のonScriptSend関数を使用して台本を送信する
2. While 自動送信中, the ScriptAutoSender shall 既存のisSending状態を参照して送信完了を待機する
3. The ScriptAutoSender shall 既存のScriptPanelと同じUIスタイルを踏襲する
4. When 自動送信とは別に手動で台本を送信した場合, the ScriptAutoSender shall 自動送信のシーケンスに影響を与えない
