# Requirements Document

## Introduction
リモート操作パネルの自動送信機能を拡張し、`samples/`フォルダ内のプリセットシーケンスファイルを即座に選択・送信できるようにする。現在はファイル選択ダイアログで毎回ファイルを選ぶ必要があるが、あらかじめ定義されたシーケンスファイルを一覧表示し、ワンクリックで選択・送信開始できる機能を追加する。

## Requirements

### Requirement 1: プリセットシーケンスファイルの自動検出
**Objective:** As a 配信者, I want リポジトリ内の所定フォルダにあるシーケンスファイルを自動的に検出してほしい, so that 毎回ファイルを手動で探す手間が省ける

#### Acceptance Criteria
1. When リモート操作ページが読み込まれた時, the ScriptAutoSenderPanel shall `samples/`フォルダ内のJSONシーケンスファイル一覧を取得して表示する
2. The プリセット一覧 shall 各シーケンスファイルのファイル名またはシーケンス名（`name`フィールド）を表示する
3. If `samples/`フォルダにシーケンスファイルが存在しない場合, then the ScriptAutoSenderPanel shall 「プリセットがありません」というメッセージを表示する
4. The プリセット一覧 shall シーケンスに含まれる台本の件数を併せて表示する

### Requirement 2: プリセットシーケンスの選択と読み込み
**Objective:** As a 配信者, I want 一覧から任意のシーケンスをワンクリックで選択したい, so that 素早く配信準備ができる

#### Acceptance Criteria
1. When ユーザーがプリセット一覧からシーケンスをクリックした時, the ScriptAutoSenderPanel shall 選択されたシーケンスを自動送信用に読み込む
2. While シーケンスが読み込み中の間, the ScriptAutoSenderPanel shall ローディング状態を表示する
3. When シーケンスの読み込みが完了した時, the ScriptAutoSenderPanel shall 既存の進捗表示・制御ボタン（開始・一時停止・停止）を表示する
4. If シーケンスファイルの読み込みに失敗した場合, then the ScriptAutoSenderPanel shall エラーメッセージを表示する

### Requirement 3: プリセット一覧の更新
**Objective:** As a 配信者, I want プリセット一覧を手動で更新したい, so that 新しく追加したシーケンスファイルをすぐに使える

#### Acceptance Criteria
1. The ScriptAutoSenderPanel shall プリセット一覧の更新ボタンを表示する
2. When ユーザーが更新ボタンをクリックした時, the ScriptAutoSenderPanel shall `samples/`フォルダを再スキャンしてプリセット一覧を更新する
3. While 更新処理中の間, the ScriptAutoSenderPanel shall 更新ボタンを無効化する

### Requirement 4: 既存のファイル選択機能との共存
**Objective:** As a 配信者, I want プリセット以外のファイルも選択できるようにしたい, so that 柔軟に任意のシーケンスを使用できる

#### Acceptance Criteria
1. The ScriptAutoSenderPanel shall 既存の「シーケンスファイルを選択」ボタンを維持する
2. When ユーザーがファイル選択でシーケンスを読み込んだ時, the ScriptAutoSenderPanel shall プリセット選択状態をクリアする
3. When ユーザーがプリセットを選択した時, the ScriptAutoSenderPanel shall ファイル選択で読み込んだシーケンスをクリアする

### Requirement 5: APIエンドポイントの提供
**Objective:** As a 開発者, I want プリセットファイル一覧を取得するAPIエンドポイントがほしい, so that クライアントから動的にファイル一覧を取得できる

#### Acceptance Criteria
1. The API shall `/api/preset-sequences`エンドポイントでプリセット一覧を返す
2. When APIが呼び出された時, the API shall `samples/`フォルダ内のJSONファイルを読み取り、ファイル名・シーケンス名・台本件数を含むリストを返す
3. The API shall 各シーケンスファイルのコンテンツを取得するためのパスまたはIDを提供する
4. When 個別のシーケンスファイルが要求された時, the API shall 該当するJSONファイルの完全な内容を返す
