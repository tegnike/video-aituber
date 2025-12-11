# Requirements Document

## Introduction
/remote画面（リモート操作パネル）にメッセージ入力フォームを追加し、台本パネルやその他のコントロールと一緒に表示切り替えできるようにする機能。メッセージ送信時にユーザー名を指定できるようにすることで、配信者が任意の名前でチャットを送信できる。

## Requirements

### Requirement 1: メッセージ入力フォームの追加
**Objective:** As a 配信者, I want /remote画面からメッセージを送信できるようにしたい, so that メイン画面を操作せずにチャットを送信できる

#### Acceptance Criteria
1. The Remote Control Page shall メッセージ入力用のテキストフィールドと送信ボタンを表示する
2. When ユーザーがメッセージを入力して送信ボタンをクリックした時, the Remote Control Page shall メイン画面にメッセージを送信する
3. When メッセージが空の状態で送信ボタンをクリックした時, the Remote Control Page shall 送信を実行せず、ボタンを無効化状態で表示する
4. While メッセージを送信中, the Remote Control Page shall 送信ボタンを無効化し、送信中の状態を表示する
5. When Enterキーが押された時, the Remote Control Page shall フォームを送信する（日本語入力確定中を除く）

### Requirement 2: 送信ユーザー名の指定機能
**Objective:** As a 配信者, I want メッセージ送信時にユーザー名を指定したい, so that 視聴者からのコメントを模擬したり、特定の名前でメッセージを送信できる

#### Acceptance Criteria
1. The Remote Control Page shall ユーザー名を入力するテキストフィールドを表示する
2. The Remote Control Page shall 入力されたユーザー名を保持し、次回の送信時にも再利用する
3. When ユーザー名が空の状態でメッセージを送信した時, the Remote Control Page shall デフォルトのユーザー名（例：「配信者」）を使用する
4. When メッセージを送信した時, the Remote Control Page shall 指定されたユーザー名をメッセージと共にメイン画面へ送信する

### Requirement 3: パネル表示切り替え機能
**Objective:** As a 配信者, I want 台本パネル・自動送信パネル・メッセージフォームの表示を切り替えたい, so that 画面を整理して必要な機能だけを表示できる

#### Acceptance Criteria
1. The Remote Control Page shall 各パネル（台本、自動送信、メッセージフォーム）の表示/非表示を切り替えるボタンまたはタブを提供する
2. When パネルの表示切り替えボタンをクリックした時, the Remote Control Page shall 対象パネルの表示状態をトグルする
3. The Remote Control Page shall パネルの表示状態をローカルに保存し、ページ再読み込み後も維持する
4. The Remote Control Page shall 少なくとも1つのパネルを常に表示状態にする（すべて非表示を防ぐ）

### Requirement 4: メイン画面との連携
**Objective:** As a システム, I want リモートから送信されたメッセージをメイン画面で処理したい, so that AIチャットフローが正しく動作する

#### Acceptance Criteria
1. When リモートからメッセージコマンドを受信した時, the Main Page shall 受信したメッセージとユーザー名をチャットフローに渡す
2. The Remote Sync System shall `sendMessage`タイプのコマンドをサポートし、メッセージ本文とユーザー名を含む
3. If メッセージ送信に失敗した時, the Remote Control Page shall エラーメッセージを表示し、再試行を可能にする
