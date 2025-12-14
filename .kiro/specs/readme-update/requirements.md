# Requirements Document

## Introduction

本仕様は、AI配信チャットアプリ「Movie Tuber」のREADMEドキュメントを現在のコードベース仕様に合わせて作成・更新するための要件を定義する。プロジェクトの概要、セットアップ手順、使用方法、技術スタック、アーキテクチャを正確に反映したドキュメントを提供することを目的とする。

## Requirements

### Requirement 1: プロジェクト概要セクション
**Objective:** 開発者・利用者として、プロジェクトの目的と主要機能を一目で理解したい。これにより、このプロジェクトが自分のニーズに合うかすぐに判断できる。

#### Acceptance Criteria
1. The README shall プロジェクト名「Movie Tuber」と簡潔な説明（1-2文）を冒頭に表示する
2. The README shall 主要機能（リアルタイムAIチャット、動画生成連携、配信向けUI、外部コメント連携）を箇条書きで記載する
3. The README shall ターゲットユースケース（AIアバター配信、インタラクティブ対話、視聴者コメント反応）を明示する

### Requirement 2: 技術スタック情報
**Objective:** 開発者として、使用されている技術を把握したい。これにより、コントリビューションや環境構築の見通しが立てられる。

#### Acceptance Criteria
1. The README shall コアテクノロジー（TypeScript, Next.js 16, React 19, Tailwind CSS 4）を記載する
2. The README shall ランタイム要件（Node.js 20+）を明示する
3. The README shall テストフレームワーク（Vitest）の使用を記載する

### Requirement 3: セットアップ手順
**Objective:** 開発者として、ローカル環境でプロジェクトを動作させたい。これにより、開発や検証をスムーズに開始できる。

#### Acceptance Criteria
1. The README shall リポジトリのクローン手順を記載する
2. The README shall 依存関係インストールコマンド（npm install）を記載する
3. The README shall 環境変数の設定方法と必要な変数（AITUBER_WORKFLOW_URL, VIDEO_GENERATION_API_URL等）を説明する
4. The README shall 開発サーバー起動コマンド（npm run dev）を記載する

### Requirement 4: プロジェクト構造の説明
**Objective:** 開発者として、コードベースの構成を理解したい。これにより、目的のコードを素早く見つけられる。

#### Acceptance Criteria
1. The README shall 主要ディレクトリ（app/, components/, hooks/, lib/, config/）の役割を説明する
2. The README shall 命名規則（PascalCase, camelCase, kebab-case）を記載する
3. The README shall 主要なAPIエンドポイント一覧を記載する

### Requirement 5: 使用方法・コマンド一覧
**Objective:** 開発者として、利用可能なnpmスクリプトを把握したい。これにより、開発ワークフローを効率的に進められる。

#### Acceptance Criteria
1. The README shall 開発コマンド（npm run dev）を記載する
2. The README shall ビルドコマンド（npm run build）を記載する
3. The README shall テストコマンド（npm run test, npm run test:watch）を記載する
4. The README shall Lintコマンド（npm run lint）を記載する

### Requirement 6: 外部サービス連携情報
**Objective:** 利用者として、必要な外部サービスとの連携方法を理解したい。これにより、システム全体を正しく構成できる。

#### Acceptance Criteria
1. The README shall Mastraワークフロー連携の概要を記載する
2. The README shall 動画生成API連携の概要を記載する
3. The README shall わんコメ（OneComme）連携の概要を記載する

### Requirement 7: アーキテクチャ概要
**Objective:** 開発者として、システムのデータフローと設計思想を把握したい。これにより、機能拡張や保守が容易になる。

#### Acceptance Criteria
1. The README shall チャット→LLM応答→動画生成→再生のフローを説明する
2. The README shall ダブルバッファリングによる動画切り替え方式を説明する
3. The README shall ポーリング方式による状態取得の仕組みを記載する
