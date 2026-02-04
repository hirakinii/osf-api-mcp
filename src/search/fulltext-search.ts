import type { SwaggerLoader } from '../utils/swagger-loader.js';
import type { FulltextSearchResult } from '../types.js';

export interface FulltextSearchParams {
  query: string;
  limit?: number;
}

export function fulltextSearch(
  loader: SwaggerLoader,
  params: FulltextSearchParams
): FulltextSearchResult[] {
  const { query, limit = 10 } = params;
  const index = loader.getFulltextIndex();

  // Tokenize query
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  // Calculate scores for each document
  const scores = new Map<string, {
    score: number;
    matchedFields: Set<string>;
  }>();

  for (const token of queryTokens) {
    const docIds = index.words.get(token);
    if (docIds) {
      for (const docId of docIds) {
        if (!scores.has(docId)) {
          scores.set(docId, { score: 0, matchedFields: new Set() });
        }
        const scoreData = scores.get(docId)!;

        // TF-IDF-like scoring
        const tf = 1 / queryTokens.length;
        const idf = Math.log(index.documents.size / docIds.size);
        scoreData.score += tf * idf;

        // Track which fields matched
        const doc = index.documents.get(docId)!;
        if (doc.summary?.toLowerCase().includes(token)) {
          scoreData.matchedFields.add('summary');
        }
        if (doc.description?.toLowerCase().includes(token)) {
          scoreData.matchedFields.add('description');
        }
      }
    }
  }

  // Convert to results and sort by score
  const results: FulltextSearchResult[] = [];
  for (const [docId, scoreData] of scores.entries()) {
    const doc = index.documents.get(docId)!;
    results.push({
      path: doc.path,
      method: doc.method,
      summary: doc.summary,
      description: doc.description,
      score: scoreData.score,
      matchedFields: Array.from(scoreData.matchedFields),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}
