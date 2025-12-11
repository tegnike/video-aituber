# Research & Design Decisions

## Summary
- **Feature**: `fix-audio-premature-playback`
- **Discovery Scope**: Extension（既存システムのバグ修正）
- **Key Findings**:
  - 事前読み込み時の `nextVideo.muted = !isAudioEnabled` が原因で音声漏れが発生
  - ダブルバッファリングの非アクティブ動画要素は常にミュート状態で保持すべき
  - 切り替え実行時のみ音声設定を適用することで二重再生を防止可能

## Research Log

### 音声漏れの原因分析
- **Context**: ループ動画再生中に次の生成動画の音声が先に流れる不具合
- **Sources Consulted**: `components/VideoPlayer.tsx` の実装コード
- **Findings**:
  - 221行目: `nextVideo.muted = !isAudioEnabled` - 事前読み込み時にユーザーの音声設定をそのまま適用
  - 音声が有効（`isAudioEnabled = true`）の場合、`muted = false` となり `load()` 呼び出し時に音声が漏れる
  - video要素の `preload="auto"` により、ブラウザが自動的にデータを読み込む際に音声出力される可能性
- **Implications**: 事前読み込み中は常に `muted = true` とし、切り替え実行時にのみ音声設定を適用する設計が必要

### 現行のダブルバッファリング実装
- **Context**: 既存のアーキテクチャパターンの確認
- **Sources Consulted**: `components/VideoPlayer.tsx` 全体
- **Findings**:
  - video1, video2の2つのHTMLVideoElementでダブルバッファリング実装
  - activeVideo状態で現在アクティブな動画を管理（1 or 2）
  - opacity制御で表示/非表示を切り替え
  - `switchVideo` 関数が切り替えロジックを担当
- **Implications**: 既存パターンを維持しつつ、ミュート制御のみ修正するアプローチが最適

### HTML5 Video要素の音声挙動
- **Context**: ブラウザのvideo要素における音声の挙動確認
- **Sources Consulted**: MDN Web Docs, HTML5仕様
- **Findings**:
  - `muted` 属性は動的に変更可能
  - `load()` 呼び出し後でも `muted` 設定は維持される
  - `play()` 呼び出しなしでも、一部ブラウザでは `preload` と `autoplay` の組み合わせで音声が出力される可能性あり
- **Implications**: 事前読み込み中は確実に `muted = true` を設定し、明示的な `play()` 呼び出し時にのみ音声を解除

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 事前読み込み時に常にミュート | 非アクティブ動画を常にミュート状態で保持 | シンプル、確実 | なし | 採用 |
| B: 音声トラックの遅延ロード | 映像のみ先に読み込み、音声は切り替え時に | 完全な分離 | 実装複雑、追加遅延 | 不採用 |
| C: Web Audio API使用 | 音声を別途管理 | 細かい制御可能 | 大規模リファクタリング必要 | 不採用 |

## Design Decisions

### Decision: 事前読み込み時の強制ミュート
- **Context**: 事前読み込み中の音声漏れを防止する必要がある
- **Alternatives Considered**:
  1. Option A — 事前読み込み時に `muted = true` を強制設定
  2. Option B — 音声と映像を別々に読み込み
- **Selected Approach**: Option A - 事前読み込み時に `muted = true` を強制設定し、切り替え実行時（`switchVideo`関数内）で音声設定を適用
- **Rationale**: 最小限の変更で確実に問題を解決でき、既存のアーキテクチャを維持できる
- **Trade-offs**: なし（純粋な改善）
- **Follow-up**: 切り替え後の音声同期を検証

### Decision: 切り替え時の音声設定タイミング
- **Context**: 切り替え実行時に映像と音声を同期させる
- **Alternatives Considered**:
  1. `play()` 呼び出し直前に `muted` を設定
  2. `canplay` イベント発火時に `muted` を設定
- **Selected Approach**: `play()` 呼び出し直前に `muted = !isAudioEnabled` を設定
- **Rationale**: 映像の再生開始と音声の有効化を確実に同期できる
- **Trade-offs**: なし
- **Follow-up**: イベントリスナー内での設定タイミングも同様に修正

## Risks & Mitigations
- Risk: 切り替え時の音声設定漏れ — `switchVideo` 関数内の全ての `play()` 呼び出し箇所を確認
- Risk: 既存の音声同期useEffectとの競合 — 事前読み込み専用のミュート制御は別ロジックとして分離

## References
- [MDN - HTMLMediaElement.muted](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted) — video要素のミュート制御
- VideoPlayer.tsx:221 — 事前読み込み時のミュート設定箇所
- VideoPlayer.tsx:268 — switchVideo内のミュート設定箇所
