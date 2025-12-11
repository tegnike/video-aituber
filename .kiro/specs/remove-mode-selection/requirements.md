# Requirements Document

## Introduction
アプリ起動時の画面モード選択画面を削除し、初回アクセス時から直接待機画面（standbyモード）を表示するように変更する。これにより、ユーザーはワンクリック少なく配信を開始できるようになる。

## Requirements

### Requirement 1: 初期画面の自動表示
**Objective:** 配信者として、アプリ起動時に自動的に待機画面を表示したい。これにより画面選択の手間を省き、すぐに配信準備ができる。

#### Acceptance Criteria
1. When アプリが起動した時, the Main Screen shall 自動的に待機画面モード（standby）を設定する
2. When アプリが起動した時, the Main Screen shall 背景動画（loopActions）の読み込みを開始する
3. The Main Screen shall 画面モード選択UIを表示しない

### Requirement 2: 初期状態の設定
**Objective:** 開発者として、アプリ起動時に適切な初期状態が設定されるようにしたい。これにより既存の機能（コントロールボタン、わんコメ連携等）が正常に動作する。

#### Acceptance Criteria
1. When アプリが起動した時, the Main Screen shall `hasStarted`を`true`に設定する
2. When アプリが起動した時, the Main Screen shall `screenMode`を`'standby'`に設定する
3. The Main Screen shall 既存のコントロールボタン（開始/終了）が正常に動作する状態を維持する
4. The Main Screen shall わんコメ連携機能が有効化可能な状態を維持する

### Requirement 3: 不要コードの削除
**Objective:** 開発者として、使用されなくなった画面モード選択関連のコードを削除したい。これによりコードベースの保守性を向上させる。

#### Acceptance Criteria
1. The Main Screen shall 画面モード選択画面のJSX（`!hasStarted`条件分岐のUI部分）を削除する
2. The Main Screen shall `handleScreenModeSelect`関数を削除または簡略化する
3. The Main Screen shall `'room'`モードに関連する設定読み込みを削除する（`screenModes.room`は不要）
4. The Main Screen shall 削除後も`hasStarted`による条件分岐（ポーリング開始等）が正常に動作する

### Requirement 4: リモート操作との互換性
**Objective:** 配信者として、リモートパネルからの操作が引き続き正常に動作してほしい。

#### Acceptance Criteria
1. The Main Screen shall リモートからの状態報告（`reportState`）が正常に動作する
2. The Main Screen shall リモートからのUI表示切替コマンドが正常に動作する
3. If リモートから`selectMode`コマンドを受信した場合, then the Main Screen shall 画面モードを切り替える（standby/roomの背景動画切り替えは維持）
