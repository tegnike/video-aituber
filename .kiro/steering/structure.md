# Project Structure

## Organization Philosophy

Next.js App Router標準構成。機能単位ではなく、Next.js規約に沿ったレイヤー型構成。

## Directory Patterns

### Pages & Layouts (`/app/`)
**Location**: `/app/`
**Purpose**: ページコンポーネントとレイアウト
**Example**: `page.tsx`, `layout.tsx`

### API Routes (`/app/api/`)
**Location**: `/app/api/[endpoint]/route.ts`
**Purpose**: バックエンドAPIエンドポイント
**Example**: `/app/api/chat/route.ts`, `/app/api/generate-video/route.ts`

### UI Components (`/components/`)
**Location**: `/components/`
**Purpose**: 再利用可能なUIコンポーネント
**Example**: `VideoPlayer.tsx`, `ChatInput.tsx`, `ChatHistory.tsx`

### Utilities (`/lib/`)
**Location**: `/lib/`
**Purpose**: 共有ユーティリティ、設定読み込み、ストア
**Example**: `loopVideoStore.ts`, `videoGenerationConfig.ts`

### Custom Hooks (`/hooks/`)
**Location**: `/hooks/`
**Purpose**: React Hooksのカスタム実装
**Example**: `useOneComme.ts`

### Configuration (`/config/`)
**Location**: `/config/`
**Purpose**: 環境非依存の設定ファイル（JSON）
**Example**: `video-generation.json`, `control-buttons.json`

## Naming Conventions

- **Files**: PascalCase（コンポーネント）、camelCase（ユーティリティ）
- **Components**: PascalCase (`VideoPlayer.tsx`)
- **Hooks**: `use`プレフィックス + PascalCase (`useOneComme.ts`)
- **API Routes**: kebab-case ディレクトリ + `route.ts`

## Import Organization

```typescript
// React/Next.js
import { useState, useEffect } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// Internal (absolute)
import VideoPlayer from '@/components/VideoPlayer';
import { useOneComme } from '@/hooks/useOneComme';

// Types (inline or co-located)
interface Message { ... }
```

**Path Aliases**:
- `@/*`: プロジェクトルート

## Code Organization Principles

- **Client Components**: `'use client'`ディレクティブを先頭に明示
- **Server Actions**: API Routesで処理、fetch経由でクライアントから呼び出し
- **状態管理**: React Hooks（useState, useCallback, useMemo）を使用
- **副作用**: useEffect内で処理、依存配列を明示

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
