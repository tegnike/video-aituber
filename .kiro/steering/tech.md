# Technology Stack

## Architecture

Next.js App Routerベースのフルスタックアプリケーション。フロントエンドはReact、バックエンドはAPI Routesで構成。外部のMastraワークフローAPIと動画生成APIに依存。

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Node.js 20+
- **UI**: React 19, Tailwind CSS 4

## Key Libraries

- **openai**: LLM API呼び出し（直接使用は限定的、主にワークフロー経由）
- **next**: フルスタックフレームワーク

## Development Standards

### Type Safety
- TypeScript strict mode有効
- 型定義はコンポーネント/API内でインライン定義
- `interface`を優先使用

### Code Quality
- ESLint (eslint-config-next)
- Prettier未設定（手動フォーマット）

### Testing
- テストフレームワーク未導入

## Development Environment

### Required Tools
- Node.js 20+
- npm

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Lint: npm run lint
```

## Key Technical Decisions

- **App Router採用**: Server ComponentsとAPI Routesの統合
- **外部ワークフロー連携**: LLMロジックをMastraワークフローに委譲（AITUBER_WORKFLOW_URL）
- **動画生成分離**: 動画生成は外部API（VIDEO_GENERATION_API_URL）に依存
- **ポーリング方式**: 動画生成状態はポーリングで取得（WebSocket未使用）
- **ダブルバッファリング**: 2つのvideo要素でシームレスな動画切り替え

---
_Document standards and patterns, not every dependency_
