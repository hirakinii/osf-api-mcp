import { describe, it, expect, beforeEach } from 'vitest';
import { searchByTag } from './tag-search.js';
import { createMinimalLoader } from '../__mocks__/swagger-loader.mock.js';
import type { SwaggerLoader } from '../utils/swagger-loader.js';

describe('searchByTag', () => {
  let loader: SwaggerLoader;

  beforeEach(async () => {
    loader = await createMinimalLoader();
  });

  describe('basic tag search', () => {
    it('should find tag by exact name', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      expect(results.length).toBe(1);
      expect(results[0].tagName).toBe('Files');
    });

    it('should return endpoints for matching tag', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      expect(results[0].endpoints.length).toBeGreaterThan(0);
      results[0].endpoints.forEach((endpoint) => {
        expect(endpoint.tags).toContain('Files');
      });
    });

    it('should return empty array when tag does not exist', async () => {
      const results = searchByTag(loader, { tag: 'NonexistentTag' });

      expect(results).toEqual([]);
    });
  });

  describe('partial matching', () => {
    it('should match tags containing search string', async () => {
      const results = searchByTag(loader, { tag: 'File' });

      expect(results.length).toBe(2);
      const tagNames = results.map((r) => r.tagName);
      expect(tagNames).toContain('Files');
      expect(tagNames).toContain('FileVersions');
    });

    it('should match multiple tags with common substring', async () => {
      const results = searchByTag(loader, { tag: 'ers' });

      // Should match "Users" which contains "ers"
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.tagName === 'Users')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('should be case insensitive', async () => {
      const resultsLower = searchByTag(loader, { tag: 'files' });
      const resultsUpper = searchByTag(loader, { tag: 'FILES' });
      const resultsMixed = searchByTag(loader, { tag: 'FiLeS' });

      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
      expect(resultsLower[0].tagName).toBe(resultsUpper[0].tagName);
    });
  });

  describe('includeDescription option', () => {
    it('should not include description by default', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      expect(results[0].description).toBeUndefined();
    });

    it('should include description when includeDescription is true', async () => {
      const results = searchByTag(loader, { tag: 'Files', includeDescription: true });

      expect(results[0].description).toBe('File operations');
    });

    it('should handle tags without description', async () => {
      // Create a tag without description in the spec
      const results = searchByTag(loader, { tag: 'Nodes', includeDescription: true });

      expect(results.length).toBe(1);
      expect(results[0].description).toBe('Node operations');
    });
  });

  describe('result structure', () => {
    it('should return TagSearchResult with correct structure', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      expect(results.length).toBe(1);
      const result = results[0];
      expect(result).toHaveProperty('tagName');
      expect(result).toHaveProperty('endpoints');
      expect(result).toHaveProperty('description');
    });

    it('should include endpoint details in results', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      const endpoint = results[0].endpoints[0];
      expect(endpoint).toHaveProperty('path');
      expect(endpoint).toHaveProperty('method');
      expect(endpoint).toHaveProperty('summary');
      expect(endpoint).toHaveProperty('operationId');
      expect(endpoint).toHaveProperty('tags');
    });
  });

  describe('multiple tag results', () => {
    it('should return all matching tags', async () => {
      // "File" matches both "Files" and "FileVersions"
      const results = searchByTag(loader, { tag: 'File' });

      expect(results.length).toBe(2);
    });

    it('should keep endpoints separate for each tag', async () => {
      const results = searchByTag(loader, { tag: 'File' });

      const filesResult = results.find((r) => r.tagName === 'Files');
      const fileVersionsResult = results.find((r) => r.tagName === 'FileVersions');

      expect(filesResult).toBeDefined();
      expect(fileVersionsResult).toBeDefined();

      // Files tag should have multiple endpoints
      expect(filesResult!.endpoints.length).toBeGreaterThan(1);
      // FileVersions tag should have at least one endpoint
      expect(fileVersionsResult!.endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('endpoint content verification', () => {
    it('should include correct endpoints for Files tag', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      const filesResult = results[0];
      const paths = filesResult.endpoints.map((e) => e.path);

      expect(paths).toContain('/files/');
      expect(paths).toContain('/files/{file_id}/');
    });

    it('should include all methods for same path', async () => {
      const results = searchByTag(loader, { tag: 'Files' });

      const filesResult = results[0];
      const fileIdEndpoints = filesResult.endpoints.filter(
        (e) => e.path === '/files/{file_id}/'
      );

      // /files/{file_id}/ has GET, PATCH, DELETE methods
      expect(fileIdEndpoints.length).toBe(3);
      const methods = fileIdEndpoints.map((e) => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('DELETE');
    });
  });
});
