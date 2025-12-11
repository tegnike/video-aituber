# Requirements Document

## Introduction
本機能は、AI配信アプリ「Movie Tuber」において、メイン配信画面（動画が表示される画面）とは別のウィンドウまたはデバイスから、ボタン操作・台本送信・各種設定を行えるリモート操作パネルを提供する。配信者がメイン画面を視聴者に見せながら、別画面で操作できるようにすることが目的。

## Requirements

### Requirement 1: リモート操作パネルページ
**Objective:** As a 配信者, I want 別画面からすべての操作を行いたい, so that メイン画面を視聴者に見せながら配信を操作できる

#### Acceptance Criteria
1. The Remote Control Panel shall リモート操作専用のページ（`/remote`）を提供する
2. When リモートパネルページにアクセスした時, the Remote Control Panel shall メイン画面と同じ操作ボタン（開始・終了）を表示する
3. When リモートパネルページにアクセスした時, the Remote Control Panel shall 台本パネルを表示する
4. The Remote Control Panel shall わんコメ連携のON/OFF切り替えボタンを表示する

### Requirement 2: メイン画面との状態同期
**Objective:** As a 配信者, I want リモートパネルからの操作がメイン画面に即座に反映される, so that タイムラグなく配信を操作できる

#### Acceptance Criteria
1. When リモートパネルで開始ボタンを押した時, the Main Screen shall 開始動画を再生する
2. When リモートパネルで終了ボタンを押した時, the Main Screen shall 終了動画を再生する
3. When リモートパネルで台本を送信した時, the Main Screen shall 対応する動画を生成・再生する
4. When リモートパネルでわんコメ連携をONにした時, the Main Screen shall わんコメからのコメントを受信し反応する
5. While リモートパネルで操作中, the Remote Control Panel shall メイン画面の現在の状態（再生中、読み込み中など）を表示する

### Requirement 3: 画面モード選択
**Objective:** As a 配信者, I want リモートパネルから画面モードを選択したい, so that メイン画面に触れずに配信を開始できる

#### Acceptance Criteria
1. When メイン画面が未開始状態の時, the Remote Control Panel shall 画面モード選択UI（待機画面/初期画面）を表示する
2. When リモートパネルで画面モードを選択した時, the Main Screen shall 選択されたモードで配信を開始する
3. While メイン画面が開始済みの時, the Remote Control Panel shall 現在のモードを表示し、操作パネルを有効化する

### Requirement 4: 状態表示
**Objective:** As a 配信者, I want リモートパネルでメイン画面の状態を確認したい, so that 配信の状況を把握できる

#### Acceptance Criteria
1. The Remote Control Panel shall メイン画面の接続状態（接続中/切断）を表示する
2. While 動画が読み込み中の時, the Remote Control Panel shall ローディング状態を表示する
3. While コントロール動画が再生中の時, the Remote Control Panel shall 再生中のアクション名を表示する
4. If メイン画面との接続が切断された時, the Remote Control Panel shall エラー状態を表示し再接続を試みる

### Requirement 5: メイン画面のUI簡素化
**Objective:** As a 配信者, I want メイン画面から操作UIを非表示にしたい, so that 視聴者に見せる画面をすっきりさせたい

#### Acceptance Criteria
1. When リモートパネルが接続されている時, the Main Screen shall コントロールボタン・台本パネルを非表示にできるオプションを提供する
2. The Main Screen shall チャット履歴の表示/非表示を切り替えられる
3. The Main Screen shall チャット入力欄の表示/非表示を切り替えられる
