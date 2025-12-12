# Requirements Document

## Introduction
コントロールの「開始」「終了」ボタンで取得する動画の順序が担保されず、バラバラの順番で再生される問題を修正する。現状、複数の動画生成リクエストが並列で実行され、完了タイミングの差異によりコールバックキューへの格納順序が不定となっている。この問題を解決し、設定ファイルで定義されたアクション順序通りに動画が再生されるようにする。

## Requirements

### Requirement 1: 動画生成リクエストの順序管理
**Objective:** As a 配信者, I want 「開始」「終了」ボタンで取得する動画が設定ファイルで定義した順序通りに再生される, so that 意図した演出を視聴者に提供できる

#### Acceptance Criteria
1. When ユーザーが「開始」ボタンをクリックする, the システム shall 設定ファイルの`start.actions`配列で定義された順序通りに動画を再生する
2. When ユーザーが「終了」ボタンをクリックする, the システム shall 設定ファイルの`end.actions`配列で定義された順序通りに動画を再生する
3. When 複数の動画生成リクエストを送信する, the システム shall 各リクエストに順序識別子（シーケンス番号）を付与する
4. The システム shall afterActionsの動画をactionsの動画の後に再生する

### Requirement 2: コールバックキューの順序保証
**Objective:** As a システム, I want コールバックで受け取った動画を正しい順序で管理する, so that 動画再生順序が保証される

#### Acceptance Criteria
1. When 動画生成コールバックを受信する, the システム shall シーケンス番号に基づいて動画を順序付けて格納する
2. While 動画キューに未処理の動画が存在する, the システム shall シーケンス番号の昇順で動画を取り出す
3. If 後続のシーケンス番号の動画が先に到着した場合, the システム shall 先行するシーケンス番号の動画が到着するまで待機する
4. The システム shall 同一セッション内の動画を識別するためのセッションIDを管理する

### Requirement 3: ポーリング機構の順序対応
**Objective:** As a システム, I want ポーリング時に正しい順序で動画を取得する, so that フロントエンドに順序通りの動画を提供できる

#### Acceptance Criteria
1. When ポーリングで動画を取得する, the システム shall 次に再生すべき動画（最小のシーケンス番号）のみを返す
2. If 次のシーケンス番号の動画がまだ到着していない場合, the システム shall nullを返して待機を継続する
3. When 全ての動画が順序通りに処理された, the システム shall セッションのクリーンアップを実行する

### Requirement 4: VideoPlayerの順序維持
**Objective:** As a 配信者, I want VideoPlayerが受け取った順序通りに動画を再生する, so that 視覚的な一貫性が保たれる

#### Acceptance Criteria
1. When initialQueueに複数の動画パスが設定される, the システム shall 配列の先頭から順番に動画を再生する
2. While 動画再生キューが存在する, the システム shall 現在の動画再生完了後に次の動画を自動再生する
3. The システム shall 受け取った順序を変更せずに動画キューを維持する
