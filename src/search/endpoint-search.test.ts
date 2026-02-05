import { describe, it, expect, beforeEach } from 'vitest';
import { searchEndpoints } from './endpoint-search.js';
import { createMinimalLoader } from '../__mocks__/swagger-loader.mock.js';
import type { SwaggerLoader } from '../utils/swagger-loader.js';

describe('searchEndpoints', () => {
  let loader: SwaggerLoader;

  beforeEach(async () => {
    loader = await createMinimalLoader();
  });

  describe('search by path', () => {
    it('should find endpoints matching path substring', async () => {
      const results = searchEndpoints(loader, { path: '/files' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.path.toLowerCase()).toContain('/files');
      });
    });

    it('should be case insensitive for path search', async () => {
      const resultsLower = searchEndpoints(loader, { path: '/files' });
      const resultsUpper = searchEndpoints(loader, { path: '/FILES' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when path does not match', async () => {
      const results = searchEndpoints(loader, { path: '/nonexistent' });

      expect(results).toEqual([]);
    });
  });

  describe('search by method', () => {
    it('should find endpoints with matching method', async () => {
      const results = searchEndpoints(loader, { method: 'GET' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.method).toBe('GET');
      });
    });

    it('should be case insensitive for method search', async () => {
      const resultsUpper = searchEndpoints(loader, { method: 'GET' });
      const resultsLower = searchEndpoints(loader, { method: 'get' });
      const resultsMixed = searchEndpoints(loader, { method: 'Get' });

      expect(resultsUpper).toEqual(resultsLower);
      expect(resultsUpper).toEqual(resultsMixed);
    });

    it('should return empty array for non-existent method', async () => {
      const results = searchEndpoints(loader, { method: 'INVALID' });

      expect(results).toEqual([]);
    });

    it('should find PATCH endpoints', async () => {
      const results = searchEndpoints(loader, { method: 'PATCH' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].method).toBe('PATCH');
    });

    it('should find POST endpoints', async () => {
      const results = searchEndpoints(loader, { method: 'POST' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].method).toBe('POST');
    });

    it('should find DELETE endpoints', async () => {
      const results = searchEndpoints(loader, { method: 'DELETE' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].method).toBe('DELETE');
    });
  });

  describe('search by tag', () => {
    it('should find endpoints with matching tag', async () => {
      const results = searchEndpoints(loader, { tag: 'Files' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.tags).toContain('Files');
      });
    });

    it('should support partial tag matching', async () => {
      const results = searchEndpoints(loader, { tag: 'File' });

      expect(results.length).toBeGreaterThan(0);
      // Should match both "Files" and "FileVersions" tags
      const hasFiles = results.some((r) => r.tags?.includes('Files'));
      const hasFileVersions = results.some((r) => r.tags?.includes('FileVersions'));
      expect(hasFiles || hasFileVersions).toBe(true);
    });

    it('should be case insensitive for tag search', async () => {
      const resultsLower = searchEndpoints(loader, { tag: 'files' });
      const resultsUpper = searchEndpoints(loader, { tag: 'FILES' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when tag does not match', async () => {
      const results = searchEndpoints(loader, { tag: 'NonexistentTag' });

      expect(results).toEqual([]);
    });
  });

  describe('search by operationId', () => {
    it('should find endpoints by operationId', async () => {
      const results = searchEndpoints(loader, { operationId: 'files_list' });

      expect(results.length).toBe(1);
      expect(results[0].operationId).toBe('files_list');
      expect(results[0].path).toBe('/files/');
    });

    it('should support partial operationId matching', async () => {
      const results = searchEndpoints(loader, { operationId: 'files' });

      expect(results.length).toBeGreaterThan(1);
      results.forEach((result) => {
        expect(result.operationId?.toLowerCase()).toContain('files');
      });
    });

    it('should be case insensitive for operationId search', async () => {
      const resultsLower = searchEndpoints(loader, { operationId: 'files_list' });
      const resultsUpper = searchEndpoints(loader, { operationId: 'FILES_LIST' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    // P0: Test that operationId search ignores other conditions
    // This documents the current behavior - operationId takes precedence
    it('should prioritize operationId over other conditions', async () => {
      // When operationId is provided, other params are ignored
      const results = searchEndpoints(loader, {
        operationId: 'files',
        method: 'POST', // This should be ignored
        path: '/nodes', // This should be ignored
      });

      // Current behavior: finds all operationIds containing "files"
      // regardless of method or path
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.operationId?.toLowerCase()).toContain('files');
      });
    });
  });

  describe('combined search criteria', () => {
    it('should filter by both path and method', async () => {
      // Use exact path match with trailing slash
      const results = searchEndpoints(loader, {
        path: '/nodes/{node_id}/',
        method: 'GET',
      });

      expect(results.length).toBe(1);
      expect(results[0].path).toBe('/nodes/{node_id}/');
      expect(results[0].method).toBe('GET');
    });

    it('should filter by path, method, and tag', async () => {
      const results = searchEndpoints(loader, {
        path: '/files',
        method: 'GET',
        tag: 'Files',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.path.toLowerCase()).toContain('/files');
        expect(result.method).toBe('GET');
        expect(result.tags).toContain('Files');
      });
    });

    it('should return empty when combined criteria do not match', async () => {
      const results = searchEndpoints(loader, {
        path: '/files',
        method: 'POST', // No POST on /files paths
      });

      expect(results).toEqual([]);
    });
  });

  describe('limit parameter', () => {
    it('should respect limit parameter', async () => {
      const results = searchEndpoints(loader, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 10', async () => {
      const results = searchEndpoints(loader, {});

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return all results when limit is larger than result set', async () => {
      const results = searchEndpoints(loader, { path: '/files/', limit: 100 });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThan(100);
    });
  });

  describe('no criteria search', () => {
    it('should return all endpoints (up to limit) when no criteria provided', async () => {
      const results = searchEndpoints(loader, {});

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('result structure', () => {
    it('should return results with correct structure', async () => {
      const results = searchEndpoints(loader, { operationId: 'files_list' });

      expect(results.length).toBe(1);
      const result = results[0];
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('operationId');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('parameters');
    });

    it('should include parameters when available', async () => {
      const results = searchEndpoints(loader, { operationId: 'files_list' });

      expect(results[0].parameters).toBeDefined();
      expect(results[0].parameters?.length).toBeGreaterThan(0);
      expect(results[0].parameters?.[0].name).toBe('page');
    });
  });
});
