# Requirements Document

## Introduction
本機能は、LLMを経由せずに事前定義された台本データを直接動画供給サーバーに送信する仕組みを提供する。これにより、あらかじめ決まった応答やシーケンスを即座に動画として再生できるようになる。配信中の定型応答（挨拶、締め、特定のリアクション等）をスムーズに行うことが主な用途となる。

## Requirements

### Requirement 1: 台本データの定義
**Objective:** As a 配信者, I want 事前に決まったテキストと動画パラメータを台本として定義したい, so that 配信中に素早く定型応答を再生できる

#### Acceptance Criteria
1. The ScriptSender shall 台本データとしてテキスト（読み上げ内容）を含む形式をサポートする
2. The ScriptSender shall 台本データとして動画生成に必要なパラメータ（表情、動作等）を含む形式をサポートする
3. When 台本データが不正な形式の場合, the ScriptSender shall エラーメッセージを表示する

### Requirement 2: 台本の直接送信
**Objective:** As a 配信者, I want 台本データをLLMを経由せず動画供給サーバーに直接送信したい, so that 待ち時間なく即座に動画生成を開始できる

#### Acceptance Criteria
1. When 台本送信が実行された時, the ScriptSender shall 動画生成APIに直接リクエストを送信する
2. The ScriptSender shall LLMワークフロー（Mastra）を経由せずに動画生成APIと通信する
3. When 動画生成APIへの送信が成功した時, the ScriptSender shall 生成された動画をVideoPlayerに連携する
4. If 動画生成APIへの送信が失敗した場合, the ScriptSender shall エラー状態を表示し再試行を可能にする

### Requirement 3: UIからの台本操作
**Objective:** As a 配信者, I want UI上で台本を選択・送信したい, so that 配信中に直感的に操作できる

#### Acceptance Criteria
1. The ScriptSender shall 利用可能な台本の一覧をUI上に表示する
2. When 台本が選択された時, the ScriptSender shall 選択された台本の内容をプレビュー表示する
3. When 送信ボタンがクリックされた時, the ScriptSender shall 選択中の台本を動画供給サーバーに送信する
4. While 動画生成が進行中の間, the ScriptSender shall 送信中であることを示すインジケーターを表示する

### Requirement 4: 既存フローとの統合
**Objective:** As a 配信者, I want 台本送信と通常のLLMチャットを併用したい, so that 状況に応じて使い分けられる

#### Acceptance Criteria
1. The ScriptSender shall 既存のVideoPlayerコンポーネントと連携して動画を再生する
2. The ScriptSender shall 既存のチャット機能（LLM経由）と独立して動作する
3. When 台本からの動画生成が完了した時, the VideoPlayer shall 通常のLLM応答動画と同じ方法で再生する

### Requirement 5: 台本データの管理
**Objective:** As a 配信者, I want 台本を設定ファイルで管理したい, so that 配信前に準備しやすい

#### Acceptance Criteria
1. The ScriptSender shall `/config/`ディレクトリ内のJSONファイルから台本データを読み込む
2. The ScriptSender shall 台本の追加・編集をファイル編集で行えるようにする
3. When アプリケーション起動時, the ScriptSender shall 設定ファイルから台本一覧を読み込む
