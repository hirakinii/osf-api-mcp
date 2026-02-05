# OSF API MCP テスト実装計画

## 概要
OSF API MCPプロジェクトにテストを追加する。Vitestを使用し、優先度順にテストを実装する。

## テストフレームワーク

**Vitest** を採用（ES Modules対応、TypeScript親和性、高速実行）

```bash
npm install -D vitest @vitest/coverage-v8
```

## テスト優先度一覧

### P0（最高優先度）- 重大なバグに関連

| ファイル | テストケース | 理由 |
|---------|------------|------|
| [swagger-loader.ts](src/utils/swagger-loader.ts) | `indexSchemaProperties`循環参照 | 無限ループの可能性（L166-168） |
| [fulltext-search.ts](src/search/fulltext-search.ts) | IDF計算でdocIds.size=0 | Infinityスコアになる（L39） |
| [endpoint-search.ts](src/search/endpoint-search.ts) | operationId+他条件の組み合わせ | operationId指定時に他条件が無視される |
| [schema-search.ts](src/search/schema-search.ts) | schemaName未定義時のキー衝突 | 重複排除で結果が失われる |

### P1（高優先度）- 機能の正確性

| ファイル | テストケース |
|---------|------------|
| endpoint-search.ts | path部分一致、method正規化、tag検索、limit制限、無効HTTPメソッド |
| fulltext-search.ts | 空クエリ処理、短いトークンフィルタ、スコアソート、matchedFields |
| schema-search.ts | schemaName/property部分一致、path+method検索 |
| tag-search.ts | 部分一致による複数マッチ、includeDescription、大文字小文字 |
| server.ts | 空文字列パラメータ検証、未知ツール名、必須パラメータ欠落 |

### P2（低優先度）- エッジケース

- 空の検索結果、複合条件検索、ファイルパスカスタマイズ、不正JSONエラー処理

## ディレクトリ構成

```
src/
  __fixtures__/
    swagger-minimal.json      # 最小テスト用Swagger仕様
    swagger-edge-cases.json   # エッジケース用
  __mocks__/
    swagger-loader.mock.ts    # モックユーティリティ
  search/
    endpoint-search.test.ts
    fulltext-search.test.ts
    schema-search.test.ts
    tag-search.test.ts
  utils/
    swagger-loader.test.ts
  server.test.ts
```

## 実装手順

### Step 1: テスト基盤構築
1. Vitest + coverage をインストール
2. [vitest.config.ts](vitest.config.ts) を作成
3. [package.json](package.json) に test スクリプト追加
4. テストフィクスチャ `src/__fixtures__/swagger-minimal.json` 作成
5. モックユーティリティ `src/__mocks__/swagger-loader.mock.ts` 作成

### Step 2: P0テスト実装
1. `src/utils/swagger-loader.test.ts` - 循環参照テスト
2. `src/search/fulltext-search.test.ts` - Infinityスコアテスト
3. `src/search/endpoint-search.test.ts` - operationId条件テスト
4. `src/search/schema-search.test.ts` - 重複排除テスト

### Step 3: P1テスト実装
1. 各検索機能の基本テスト
2. server.ts の入力検証テスト

### Step 4: P2テスト・統合テスト
1. 残りのエッジケーステスト
2. カバレッジ確認

## 設定ファイル

### vitest.config.ts
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
      exclude: ['src/**/*.test.ts', 'src/index.ts']
    }
  }
});
```

### package.json scripts追加
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## テスト検証方法

1. `npm test` - watchモードでテスト実行
2. `npm run test:run` - 単発テスト実行
3. `npm run test:coverage` - カバレッジレポート生成

## 対象ファイル

- [src/utils/swagger-loader.ts](src/utils/swagger-loader.ts) - インデックス構築ロジック
- [src/search/endpoint-search.ts](src/search/endpoint-search.ts) - エンドポイント検索
- [src/search/fulltext-search.ts](src/search/fulltext-search.ts) - フルテキスト検索
- [src/search/schema-search.ts](src/search/schema-search.ts) - スキーマ検索
- [src/search/tag-search.ts](src/search/tag-search.ts) - タグ検索
- [src/server.ts](src/server.ts) - MCPサーバー実装
