# Implementation Plan

## Tasks

- [x] 1. README.mdファイルの作成とヘッダーセクション
  - プロジェクトルートにREADME.mdファイルを新規作成
  - プロジェクト名「Movie Tuber」を見出しとして記載
  - AIチャット配信アプリケーションとしての簡潔な説明文を追加
  - _Requirements: 1.1_

- [x] 2. 機能紹介とユースケースセクション
  - 主要機能（リアルタイムAIチャット、動画生成連携、配信向けUI、外部コメント連携）を箇条書きで記載
  - ターゲットユースケース（AIアバター配信、インタラクティブ対話、視聴者コメント反応）を明示
  - _Requirements: 1.2, 1.3_

- [x] 3. 技術スタックセクション
  - コアテクノロジー（TypeScript strict mode, Next.js 16, React 19, Tailwind CSS 4）をテーブル形式で記載
  - ランタイム要件（Node.js 20+）を明示
  - テストフレームワーク（Vitest）の使用を記載
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. セットアップ手順セクション
  - リポジトリのクローン手順をコードブロックで記載
  - 依存関係インストールコマンド（npm install）を記載
  - 環境変数設定の説明と必要な変数（AITUBER_WORKFLOW_URL, VIDEO_GENERATION_API_URL）の一覧を記載
  - 開発サーバー起動コマンド（npm run dev）を記載
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. プロジェクト構造セクション
  - 主要ディレクトリ（app/, components/, hooks/, lib/, config/）の役割を説明
  - 命名規則（PascalCase, camelCase, kebab-case）を記載
  - 主要なAPIエンドポイント一覧（/api/chat, /api/generate-video, /api/video, /api/scripts, /api/remote/*）を記載
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. npmスクリプト一覧セクション
  - 開発コマンド（npm run dev）を記載
  - ビルドコマンド（npm run build）を記載
  - テストコマンド（npm run test, npm run test:watch）を記載
  - Lintコマンド（npm run lint）を記載
  - コマンド一覧をテーブル形式で整理
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. 外部サービス連携セクション
  - Mastraワークフロー連携の概要（LLM応答生成の委譲）を記載
  - 動画生成API連携の概要（アバター動画生成）を記載
  - わんコメ（OneComme）連携の概要（配信コメント取り込み）を記載
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. アーキテクチャ概要セクション
  - チャット→LLM応答→動画生成→再生のデータフローを説明
  - ダブルバッファリングによる動画切り替え方式（2つのvideo要素）を説明
  - ポーリング方式による状態取得の仕組みを記載
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. ドキュメント検証
  - 全セクションが要件をカバーしていることを確認
  - コードブロックの構文が正確であることを確認
  - 環境変数名が実コードと整合していることを確認
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_
