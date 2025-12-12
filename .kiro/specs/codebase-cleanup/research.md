# Research & Design Decisions

## Summary
- **Feature**: `codebase-cleanup`
- **Discovery Scope**: Extension（既存コードベースの整理・保守作業）
- **Key Findings**:
  - 本プロジェクトは手動解析アプローチが最適（外部ツール導入のオーバーヘッドを回避）
  - Next.js App Routerの静的解析はGlob/Grepベースで十分対応可能
  - TypeScript/ESLintの既存設定を活用してビルド・リント検証が可能

## Research Log

### 未使用コード検出アプローチの検討
- **Context**: 未使用コードを効率的に検出する方法の選定
- **Sources Consulted**:
  - プロジェクト構造の静的解析
  - package.json依存関係の確認
- **Findings**:
  - コンポーネント: 10ファイル（`/components/`）
  - ユーティリティ: 11ファイル（`/lib/`）
  - フック: 7ファイル（`/hooks/`）
  - APIルート: 15ファイル（`/app/api/`）
  - 設定ファイル: 3ファイル（`/config/`）
  - 依存関係: 4個（dependencies）、12個（devDependencies）
- **Implications**:
  - 小〜中規模プロジェクトのため、手動Grep解析で十分対応可能
  - 外部ツール（depcheck等）の導入は不要

### 検出対象の分類
- **Context**: 各カテゴリの検出戦略の策定
- **Sources Consulted**: プロジェクトファイル構造
- **Findings**:
  - コンポーネント: `import`文の検索で使用状況を特定
  - ユーティリティ: `export`とその参照の照合
  - APIルート: fetch/URL文字列の検索
  - 依存関係: import文とpackage.jsonの照合
  - 設定ファイル: importパスの検索
- **Implications**: 各カテゴリに対して一貫したGrep/Globベースの検出ロジックを適用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 手動Grep解析 | Claude Codeツールを使用した静的解析 | 追加依存不要、柔軟性高い | 動的インポートの検出に限界 | 選択 |
| depcheck | npm依存関係チェックツール | 自動化、網羅性 | 追加インストール必要、カスタマイズ困難 | 却下 |
| ts-prune | TypeScript未使用エクスポート検出 | 精度高い | 追加インストール必要 | 却下 |

## Design Decisions

### Decision: 手動静的解析アプローチの採用
- **Context**: 未使用コード検出の実装方法を決定する必要がある
- **Alternatives Considered**:
  1. 外部ツール（depcheck, ts-prune）の導入
  2. カスタムスクリプトの作成
  3. Claude Codeのツールを使用した手動解析
- **Selected Approach**: Claude Codeのツール（Glob, Grep）を使用した手動解析
- **Rationale**:
  - プロジェクト規模が小〜中のため外部ツールのオーバーヘッドは不要
  - 実行時に即座に検証可能
  - 柔軟なカスタマイズが可能
- **Trade-offs**:
  - メリット: 追加依存なし、即座に実行可能
  - デメリット: 動的インポートの完全検出は困難
- **Follow-up**: 削除後にビルド・リントで検証

### Decision: カテゴリ別段階的削除
- **Context**: 削除の安全性を確保しつつ効率的に進める方法
- **Selected Approach**: カテゴリ別（コンポーネント→ユーティリティ→API→依存関係→設定）に段階的に削除
- **Rationale**: 各段階でビルド・リント検証を行い、問題を早期発見
- **Trade-offs**:
  - メリット: 問題発生時の切り分けが容易
  - デメリット: 複数回のビルド実行が必要

## Risks & Mitigations
- 動的インポートの見逃し — ビルド・リント検証で検出、必要に応じてロールバック
- 外部システムから呼び出されるAPI — 警告付きで報告し、削除は慎重に判断
- テストファイルの誤検出 — `.test.ts`/`.test.tsx`ファイルは解析対象から除外

## References
- Next.js App Router Documentation — プロジェクト構造の理解
- TypeScript Handbook — 型安全性とエクスポート解析の参考
