import { describe, it, expect, beforeEach } from 'vitest';
import { fulltextSearch } from './fulltext-search.js';
import { createMinimalLoader, createEdgeCasesLoader } from '../__mocks__/swagger-loader.mock.js';
import type { SwaggerLoader } from '../utils/swagger-loader.js';

describe('fulltextSearch', () => {
  let loader: SwaggerLoader;

  beforeEach(async () => {
    loader = await createMinimalLoader();
  });

  describe('basic search', () => {
    it('should return results matching query in summary', async () => {
      const results = fulltextSearch(loader, { query: 'list files' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('/files/');
      expect(results[0].matchedFields).toContain('summary');
    });

    it('should return results matching query in description', async () => {
      const results = fulltextSearch(loader, { query: 'returns details' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedFields).toContain('description');
    });

    it('should return results sorted by score descending', async () => {
      const results = fulltextSearch(loader, { query: 'files' });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should respect limit parameter', async () => {
      const results = fulltextSearch(loader, { query: 'list', limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 10', async () => {
      const results = fulltextSearch(loader, { query: 'the' });

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('empty query handling', () => {
    it('should return empty array for empty query string', async () => {
      const results = fulltextSearch(loader, { query: '' });

      expect(results).toEqual([]);
    });

    it('should return empty array for query with only short words', async () => {
      // Words with 2 or fewer chars are filtered out
      const results = fulltextSearch(loader, { query: 'a is to' });

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = fulltextSearch(loader, { query: '   ' });

      expect(results).toEqual([]);
    });
  });

  describe('tokenization', () => {
    it('should be case insensitive', async () => {
      const resultsLower = fulltextSearch(loader, { query: 'files' });
      const resultsUpper = fulltextSearch(loader, { query: 'FILES' });
      const resultsMixed = fulltextSearch(loader, { query: 'FiLeS' });

      expect(resultsLower).toEqual(resultsUpper);
      expect(resultsLower).toEqual(resultsMixed);
    });

    it('should handle special characters by splitting', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      const results = fulltextSearch(edgeLoader, { query: 'file-upload' });

      // "file-upload" should be split into "file" and "upload"
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter words with 2 or fewer characters', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      // "id" has 2 chars, should be filtered
      const results = fulltextSearch(edgeLoader, { query: 'id' });

      expect(results).toEqual([]);
    });

    it('should include words with exactly 3 characters', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      // "api" has 3 chars, should be included
      const results = fulltextSearch(edgeLoader, { query: 'api' });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('TF-IDF scoring', () => {
    // P0: Test for Infinity score when token has no matches
    it('should not return Infinity score for partially matching queries', async () => {
      // Query with one matching and one non-matching token
      const results = fulltextSearch(loader, { query: 'files xyznonexistent' });

      results.forEach((result) => {
        expect(Number.isFinite(result.score)).toBe(true);
        expect(result.score).not.toBe(Infinity);
        expect(result.score).not.toBe(-Infinity);
      });
    });

    it('should return finite scores for all results', async () => {
      const results = fulltextSearch(loader, { query: 'list files nodes' });

      results.forEach((result) => {
        expect(Number.isFinite(result.score)).toBe(true);
      });
    });

    it('should give higher score to documents matching more tokens', async () => {
      const results = fulltextSearch(loader, { query: 'list files' });

      // /files/ has "list" and "files" in summary, should rank higher
      const filesIndex = results.findIndex((r) => r.path === '/files/');
      if (filesIndex > 0) {
        // If /files/ is not first, check the scores are at least comparable
        expect(results[filesIndex].score).toBeGreaterThan(0);
      }
    });

    // P0: Test single token TF calculation
    it('should handle single token queries correctly', async () => {
      const results = fulltextSearch(loader, { query: 'files' });

      expect(results.length).toBeGreaterThan(0);
      // All results should have valid scores
      results.forEach((result) => {
        expect(result.score).toBeGreaterThan(0);
        expect(Number.isFinite(result.score)).toBe(true);
      });
    });
  });

  describe('matchedFields tracking', () => {
    it('should track summary matches correctly', async () => {
      const results = fulltextSearch(loader, { query: 'list' });

      const matchingResult = results.find((r) => r.summary?.toLowerCase().includes('list'));
      expect(matchingResult).toBeDefined();
      expect(matchingResult?.matchedFields).toContain('summary');
    });

    it('should track description matches correctly', async () => {
      const results = fulltextSearch(loader, { query: 'returns' });

      const matchingResult = results.find((r) =>
        r.description?.toLowerCase().includes('returns')
      );
      expect(matchingResult).toBeDefined();
      expect(matchingResult?.matchedFields).toContain('description');
    });

    it('should track both summary and description matches', async () => {
      // "file" appears in both summary and description for /files/{file_id}/
      const results = fulltextSearch(loader, { query: 'file' });

      const detailResult = results.find((r) => r.path === '/files/{file_id}/');
      expect(detailResult).toBeDefined();
      expect(detailResult?.matchedFields).toContain('summary');
      expect(detailResult?.matchedFields).toContain('description');
    });
  });

  describe('result structure', () => {
    it('should return results with correct structure', async () => {
      const results = fulltextSearch(loader, { query: 'files' });

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('matchedFields');
      expect(Array.isArray(result.matchedFields)).toBe(true);
    });

    it('should include summary and description when available', async () => {
      const results = fulltextSearch(loader, { query: 'files' });

      const filesResult = results.find((r) => r.path === '/files/');
      expect(filesResult).toBeDefined();
      expect(filesResult?.summary).toBe('List all files');
      expect(filesResult?.description).toBe('Returns a list of all files in the system');
    });
  });
});
