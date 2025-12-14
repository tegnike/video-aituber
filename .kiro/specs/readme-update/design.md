# Design Document

## Overview

**Purpose**: 本フィーチャーは、AI配信チャットアプリ「Movie Tuber」の正確で最新のREADMEドキュメントを提供する。開発者および利用者がプロジェクトの目的、セットアップ方法、技術スタックを迅速に理解できるようにする。

**Users**: 新規コントリビューター、プロジェクト利用者、将来の開発者がリポジトリ閲覧時に本ドキュメントを参照する。

**Impact**: 現在存在しない、または不完全なREADME.mdを新規作成・更新し、プロジェクトの可視性とオンボーディング体験を向上させる。

### Goals
- プロジェクト概要と主要機能を明確に伝える
- セットアップ手順を完全かつ正確に記載する
- 技術スタックとアーキテクチャを文書化する
- 外部サービス連携の概要を説明する

### Non-Goals
- 詳細なAPI仕様書の作成（別途docs/で対応）
- コントリビューションガイドラインの策定
- ライセンス情報の詳細記載

## Architecture

### Architecture Pattern & Boundary Map

本フィーチャーはドキュメント作成のため、アーキテクチャ変更は発生しない。既存のプロジェクト構造を正確に反映したドキュメントを作成する。

**Selected Pattern**: 単一README.md方式（詳細は`research.md`参照）

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Documentation | Markdown | README形式 | GitHub標準対応 |

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1, 1.2, 1.3 | プロジェクト概要 | README.md Overview Section | N/A | N/A |
| 2.1, 2.2, 2.3 | 技術スタック | README.md Tech Stack Section | N/A | N/A |
| 3.1, 3.2, 3.3, 3.4 | セットアップ手順 | README.md Getting Started Section | N/A | N/A |
| 4.1, 4.2, 4.3 | プロジェクト構造 | README.md Structure Section | N/A | N/A |
| 5.1, 5.2, 5.3, 5.4 | コマンド一覧 | README.md Scripts Section | N/A | N/A |
| 6.1, 6.2, 6.3 | 外部サービス連携 | README.md Integration Section | N/A | N/A |
| 7.1, 7.2, 7.3 | アーキテクチャ概要 | README.md Architecture Section | N/A | N/A |

## Components and Interfaces

本フィーチャーはドキュメント作成のため、ソフトウェアコンポーネントは存在しない。以下にREADME.mdの構成セクションを定義する。

### README.md セクション構成

| Section | Purpose | Requirement Coverage |
|---------|---------|---------------------|
| Header | プロジェクト名と簡潔な説明 | 1.1 |
| Features | 主要機能の箇条書き | 1.2, 1.3 |
| Tech Stack | 使用技術一覧 | 2.1, 2.2, 2.3 |
| Getting Started | セットアップ手順 | 3.1, 3.2, 3.3, 3.4 |
| Project Structure | ディレクトリ構成説明 | 4.1, 4.2, 4.3 |
| Scripts | npmコマンド一覧 | 5.1, 5.2, 5.3, 5.4 |
| External Services | 外部連携の説明 | 6.1, 6.2, 6.3 |
| Architecture | システムフロー説明 | 7.1, 7.2, 7.3 |

### セクション詳細

#### Header Section
| Field | Detail |
|-------|--------|
| Intent | プロジェクト名と1-2文の説明を表示 |
| Requirements | 1.1 |

**Content Structure**:
```markdown
# Movie Tuber

AIとのチャットをリアルタイムで配信するWebアプリケーション
```

#### Features Section
| Field | Detail |
|-------|--------|
| Intent | 主要機能を箇条書きで列挙 |
| Requirements | 1.2, 1.3 |

**Content Elements**:
- リアルタイムAIチャット
- 動画生成連携
- 配信向けUI
- 外部コメント連携（わんコメ）
- ターゲットユースケース

#### Tech Stack Section
| Field | Detail |
|-------|--------|
| Intent | 使用技術をテーブル形式で表示 |
| Requirements | 2.1, 2.2, 2.3 |

**Content Elements**:
- TypeScript (strict mode)
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Node.js 20+
- Vitest（テスト）

#### Getting Started Section
| Field | Detail |
|-------|--------|
| Intent | セットアップ手順をステップバイステップで記載 |
| Requirements | 3.1, 3.2, 3.3, 3.4 |

**Content Elements**:
1. リポジトリクローン
2. 依存関係インストール（`npm install`）
3. 環境変数設定（`.env.local`）
4. 開発サーバー起動（`npm run dev`）

**環境変数一覧**:
- `AITUBER_WORKFLOW_URL`: Mastraワークフローエンドポイント
- `VIDEO_GENERATION_API_URL`: 動画生成APIエンドポイント

#### Project Structure Section
| Field | Detail |
|-------|--------|
| Intent | ディレクトリ構成と命名規則を説明 |
| Requirements | 4.1, 4.2, 4.3 |

**Content Elements**:
- `/app/`: ページとレイアウト
- `/app/api/`: APIエンドポイント
- `/components/`: UIコンポーネント
- `/hooks/`: カスタムHooks
- `/lib/`: ユーティリティ
- `/config/`: 設定ファイル

**API Endpoints一覧**:
- `/api/chat`: チャット処理
- `/api/generate-video`: 動画生成リクエスト
- `/api/video`: 動画状態取得
- `/api/scripts`: スクリプト管理
- `/api/remote/*`: リモート制御

#### Scripts Section
| Field | Detail |
|-------|--------|
| Intent | 利用可能なnpmスクリプトを記載 |
| Requirements | 5.1, 5.2, 5.3, 5.4 |

**Content Elements**:
```markdown
| Command | Description |
|---------|-------------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLintチェック |
| `npm run test` | テスト実行 |
| `npm run test:watch` | テストウォッチモード |
```

#### External Services Section
| Field | Detail |
|-------|--------|
| Intent | 外部サービス連携の概要を説明 |
| Requirements | 6.1, 6.2, 6.3 |

**Content Elements**:
- **Mastraワークフロー**: LLM応答生成を外部ワークフローに委譲
- **動画生成API**: AI応答に対応するアバター動画を生成
- **わんコメ（OneComme）**: 配信コメントの取り込み

#### Architecture Section
| Field | Detail |
|-------|--------|
| Intent | システムのデータフローと設計思想を説明 |
| Requirements | 7.1, 7.2, 7.3 |

**Content Elements**:
- チャット→LLM応答→動画生成→再生のフロー
- ダブルバッファリング方式（2つのvideo要素）
- ポーリング方式による状態取得

## Data Models

本フィーチャーはドキュメント作成のため、データモデル変更は発生しない。

## Error Handling

本フィーチャーはドキュメント作成のため、エラーハンドリングは不要。

## Testing Strategy

### ドキュメント検証
- 全リンクの有効性確認
- コードブロックの構文正確性
- 環境変数名の実コードとの整合性
- セクション構成の要件カバレッジ確認
