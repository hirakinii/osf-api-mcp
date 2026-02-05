# テスト実装スキル

このドキュメントは、プロジェクトにテストコードを実装する際のガイドラインです。

## 概要

プロジェクトにテストが存在しない、または不十分な場合に、体系的にテストを計画・実装するためのスキルです。

## 前提条件

- TypeScript/JavaScript プロジェクト
- Node.js 環境
- ES Modules (`"type": "module"`) を使用

## 実行手順

### Phase 1: 調査

1. **プロジェクト構造の把握**
   - ディレクトリ構成を確認
   - ソースコードファイルを特定
   - 既存のテスト設定があるか確認
   - `package.json` の依存関係とスクリプトを確認

2. **コードの詳細分析**
   - 各ファイルの責務と機能を理解
   - 主要な関数・クラス・メソッドを特定
   - 外部依存関係（API呼び出し等）を確認
   - 複雑なロジックやエッジケースを特定

3. **テストが必要な箇所の特定**
   - バグの可能性がある箇所（P0）
   - 機能の正確性に関わる箇所（P1）
   - エッジケース（P2）

### Phase 2: 計画

1. **テストフレームワークの選定**
   - ES Modules プロジェクト → **Vitest** を推奨
   - CommonJS プロジェクト → Jest も選択肢

2. **テスト優先度の決定**

   | 優先度 | 説明 | 例 |
   |--------|------|-----|
   | P0 | 重大なバグに関連 | 無限ループ、データ損失、Infinityスコア |
   | P1 | 機能の正確性 | 検索ロジック、入力検証、正規化 |
   | P2 | エッジケース | 空入力、境界値、特殊文字 |

3. **計画ドキュメントの作成**
   - `docs/plans/test-implementation-issue-{番号}.md` に出力

### Phase 3: 実装

1. **テスト基盤の構築**

   ```bash
   # Vitest + カバレッジのインストール
   npm install -D vitest @vitest/coverage-v8
   ```

2. **設定ファイルの作成**

   `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       include: ['src/**/*.test.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         include: ['src/**/*.ts'],
         exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/types.ts'],
         thresholds: {
           statements: 80,
           branches: 75,
           functions: 80,
           lines: 80,
         },
       },
     },
   });
   ```

3. **package.json へのスクリプト追加**

   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:run": "vitest run",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

4. **ディレクトリ構成**

   ```
   src/
     __fixtures__/          # テスト用データ
       minimal.json
       edge-cases.json
     __mocks__/             # モックユーティリティ
       loader.mock.ts
     feature/
       feature.ts
       feature.test.ts      # テストファイルはソースと同じ場所に配置
   ```

5. **テストファイルの命名規則**
   - `{ファイル名}.test.ts` 形式
   - ソースファイルと同じディレクトリに配置

6. **実装順序**
   1. テストフィクスチャ作成
   2. モックユーティリティ作成
   3. P0 テスト実装
   4. P1 テスト実装
   5. P2 テスト実装

### Phase 4: 検証

1. **テスト実行**
   ```bash
   npm run test:run
   ```

2. **カバレッジ確認**
   ```bash
   npm run test:coverage
   ```

3. **目標値の調整**
   - 統合部分（外部SDK、stdio通信等）はテストが困難
   - 必要に応じてしきい値を調整

### Phase 5: ドキュメント化

1. **結果レポートの作成**
   - `docs/results/test-implementation-issue-{番号}-result.md` に出力
   - 含める内容:
     - テスト統計（ファイル数、ケース数、成功率）
     - カバレッジ（目標値と実績値）
     - 追加/変更されたファイル一覧
     - 未カバー領域の説明

## テストコードのテンプレート

### 基本構造

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { targetFunction } from './target.js';

describe('targetFunction', () => {
  describe('正常系', () => {
    it('should return expected result for valid input', () => {
      const result = targetFunction({ validInput: true });
      expect(result).toBeDefined();
    });
  });

  describe('異常系', () => {
    it('should throw error for invalid input', () => {
      expect(() => targetFunction({})).toThrow('error message');
    });
  });

  describe('エッジケース', () => {
    it('should handle empty input', () => {
      const result = targetFunction({ input: '' });
      expect(result).toEqual([]);
    });
  });
});
```

### モックの使用

```typescript
import { vi } from 'vitest';

// モジュール全体をモック
vi.mock('./dependency.js', () => ({
  dependencyFunction: vi.fn().mockReturnValue('mocked'),
}));

// 部分モック
vi.mock('./loader.js', async () => {
  const actual = await vi.importActual('./loader.js');
  return {
    ...actual,
    load: vi.fn().mockResolvedValue(mockData),
  };
});
```

### フィクスチャの使用

```typescript
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getFixturePath(name: string): string {
  return join(__dirname, '../__fixtures__', name);
}
```

## カバレッジ目標のガイドライン

| 対象 | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| コアロジック | 100% | 90%+ | 100% | 100% |
| ユーティリティ | 95%+ | 80%+ | 100% | 95%+ |
| 統合部分 | 65%+ | 35%+ | 80%+ | 65%+ |
| 全体 | 80%+ | 75%+ | 80%+ | 80%+ |

## 注意事項

1. **テスト困難な箇所**
   - 外部SDKとの統合部分
   - stdio/ネットワーク通信
   - switch文のdefaultケース（到達不能な場合）

2. **型定義ファイル**
   - `types.ts` など型のみのファイルはカバレッジから除外

3. **エントリーポイント**
   - `index.ts` は通常カバレッジから除外

## 参考: 実装例

- 計画: `docs/plans/test-implementation-issue-1.md`
- 結果: `docs/results/test-implementation-issue-1-result.md`
