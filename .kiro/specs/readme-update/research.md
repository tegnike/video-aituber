# Research & Design Decisions

## Summary
- **Feature**: `readme-update`
- **Discovery Scope**: Simple Addition
- **Key Findings**:
  - READMEはプロジェクトルートに配置し、Markdown形式で作成する
  - ステアリングドキュメント（product.md, tech.md, structure.md）から正確な情報を抽出可能
  - 既存のpackage.jsonとコードベース構造から技術的詳細を取得可能

## Research Log

### README構造のベストプラクティス
- **Context**: GitHubプロジェクトの標準的なREADME構成を確認
- **Sources Consulted**: GitHub公式ドキュメント、オープンソースプロジェクト
- **Findings**:
  - プロジェクト名と概要を冒頭に配置
  - 技術スタック、セットアップ手順、使用方法の順で構成
  - コードブロックでコマンドを明示
  - バッジ（CI/CD等）はオプション
- **Implications**: シンプルで読みやすい構成を採用

### 環境変数の特定
- **Context**: セットアップ手順に必要な環境変数を特定
- **Sources Consulted**: コードベースのAPI Routes、設定ファイル
- **Findings**:
  - `AITUBER_WORKFLOW_URL`: Mastraワークフロー連携用
  - `VIDEO_GENERATION_API_URL`: 動画生成API連携用
  - `ONECOMME_*`: わんコメ連携用（オプション）
- **Implications**: 環境変数設定例を.env.exampleとして記載推奨

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Single README.md | プロジェクトルートに単一ファイル | シンプル、GitHub表示対応 | 長くなると読みにくい | 現時点では十分 |
| 分割ドキュメント | docs/配下に詳細ドキュメント | 詳細記載可能 | 導線複雑化 | 将来的な拡張用 |

## Design Decisions

### Decision: 単一README.md方式を採用
- **Context**: プロジェクトドキュメントの構成方法を決定
- **Alternatives Considered**:
  1. 単一README.md — 全情報を1ファイルに集約
  2. 分割方式 — README.md + docs/配下に詳細
- **Selected Approach**: 単一README.md方式
- **Rationale**: 現時点のプロジェクト規模では単一ファイルで十分。GitHubリポジトリページで即座に表示される利点あり
- **Trade-offs**: 将来的に情報が増えた場合は分割を検討
- **Follow-up**: ドキュメントが500行を超えた場合に分割を再検討

## Risks & Mitigations
- 環境変数の漏洩リスク — `.env.example`として実際の値を含めない形式で記載
- 情報の陳腐化リスク — ステアリングドキュメントとの整合性を定期確認

## References
- GitHub README Best Practices
- Next.js公式ドキュメント
