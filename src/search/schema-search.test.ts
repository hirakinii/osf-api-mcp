import { describe, it, expect, beforeEach } from 'vitest';
import { searchSchemas } from './schema-search.js';
import { createMinimalLoader, createEdgeCasesLoader } from '../__mocks__/swagger-loader.mock.js';
import type { SwaggerLoader } from '../utils/swagger-loader.js';

describe('searchSchemas', () => {
  let loader: SwaggerLoader;

  beforeEach(async () => {
    loader = await createMinimalLoader();
  });

  describe('search by schemaName', () => {
    it('should find schemas by exact name', async () => {
      const results = searchSchemas(loader, { schemaName: 'FileList' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schemaName).toBe('FileList');
    });

    it('should support partial schema name matching', async () => {
      const results = searchSchemas(loader, { schemaName: 'File' });

      expect(results.length).toBeGreaterThan(0);
      // Should match FileList, File, FileVersionList
      const schemaNames = results.map((r) => r.schemaName);
      expect(schemaNames.some((name) => name?.includes('File'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      const resultsLower = searchSchemas(loader, { schemaName: 'filelist' });
      const resultsUpper = searchSchemas(loader, { schemaName: 'FILELIST' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when schema name does not match', async () => {
      const results = searchSchemas(loader, { schemaName: 'NonexistentSchema' });

      expect(results).toEqual([]);
    });
  });

  describe('search by property', () => {
    it('should find schemas containing property', async () => {
      const results = searchSchemas(loader, { property: 'id' });

      expect(results.length).toBeGreaterThan(0);
      // All results should have schemas with 'id' property
      results.forEach((result) => {
        const props = result.schema.properties || result.schema.items?.properties;
        expect(props).toBeDefined();
      });
    });

    it('should support partial property name matching', async () => {
      const results = searchSchemas(loader, { property: 'nam' });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive for property search', async () => {
      const resultsLower = searchSchemas(loader, { property: 'name' });
      const resultsUpper = searchSchemas(loader, { property: 'NAME' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when property does not exist', async () => {
      const results = searchSchemas(loader, { property: 'nonexistentprop' });

      expect(results).toEqual([]);
    });

    it('should find properties in array items', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      const results = searchSchemas(edgeLoader, { property: 'itemProp' });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('search by path and method', () => {
    it('should find schema for specific endpoint', async () => {
      const results = searchSchemas(loader, { path: '/files/', method: 'GET' });

      expect(results.length).toBe(1);
      expect(results[0].path).toBe('/files/');
      expect(results[0].method).toBe('GET');
      expect(results[0].schemaName).toBe('FileList');
    });

    it('should normalize method to uppercase', async () => {
      const resultsLower = searchSchemas(loader, { path: '/files/', method: 'get' });
      const resultsUpper = searchSchemas(loader, { path: '/files/', method: 'GET' });

      expect(resultsLower).toEqual(resultsUpper);
    });

    it('should return empty array when endpoint does not exist', async () => {
      const results = searchSchemas(loader, { path: '/nonexistent/', method: 'GET' });

      expect(results).toEqual([]);
    });

    it('should return empty array when method does not exist for path', async () => {
      const results = searchSchemas(loader, { path: '/files/', method: 'DELETE' });

      expect(results).toEqual([]);
    });

    it('should return empty array when endpoint has no response schema', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      const results = searchSchemas(edgeLoader, { path: '/empty-response/', method: 'GET' });

      expect(results).toEqual([]);
    });

    it('should require both path and method', async () => {
      // Only path provided, should return empty
      const resultsPathOnly = searchSchemas(loader, { path: '/files/' });
      // Only method provided, should return empty
      const resultsMethodOnly = searchSchemas(loader, { method: 'GET' });

      expect(resultsPathOnly).toEqual([]);
      expect(resultsMethodOnly).toEqual([]);
    });
  });

  describe('no criteria search', () => {
    it('should return empty array when no criteria provided', async () => {
      const results = searchSchemas(loader, {});

      expect(results).toEqual([]);
    });
  });

  describe('duplicate removal', () => {
    it('should remove duplicate results', async () => {
      // Property 'id' appears in multiple schemas, some from same endpoint
      const results = searchSchemas(loader, { property: 'id' });

      // Check for uniqueness based on path:method:schemaName
      const keys = results.map((r) => `${r.path}:${r.method}:${r.schemaName}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    // P0: Test for schemaName undefined key collision
    it('should not lose results when schemaName is undefined', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      // Search for 'data' property which exists in endpoints without x-response-schema
      const results = searchSchemas(edgeLoader, { property: 'data' });

      // Both /endpoint-no-schema-name/ and /another-no-schema-name/ have 'data' property
      // With undefined schemaName, keys would be:
      // "/endpoint-no-schema-name/:GET:undefined"
      // "/another-no-schema-name/:GET:undefined"
      // These are different paths, so both should be kept
      expect(results.length).toBe(2);
    });

    it('should handle key with undefined schemaName correctly', async () => {
      const edgeLoader = await createEdgeCasesLoader();
      const results = searchSchemas(edgeLoader, { property: 'data' });

      // Verify both endpoints are returned
      const paths = results.map((r) => r.path);
      expect(paths).toContain('/endpoint-no-schema-name/');
      expect(paths).toContain('/another-no-schema-name/');
    });
  });

  describe('result structure', () => {
    it('should return results with correct structure', async () => {
      const results = searchSchemas(loader, { schemaName: 'FileList' });

      expect(results.length).toBe(1);
      const result = results[0];
      expect(result).toHaveProperty('schemaName');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('schema');
    });

    it('should include schema object with properties', async () => {
      const results = searchSchemas(loader, { schemaName: 'FileList' });

      expect(results[0].schema).toBeDefined();
      expect(results[0].schema.type).toBe('array');
      expect(results[0].schema.items).toBeDefined();
    });
  });

  describe('priority of search criteria', () => {
    it('should prioritize schemaName over property', async () => {
      // When both are provided, schemaName takes precedence
      const results = searchSchemas(loader, {
        schemaName: 'FileList',
        property: 'username', // This should be ignored
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schemaName).toBe('FileList');
    });

    it('should prioritize schemaName over path/method', async () => {
      const results = searchSchemas(loader, {
        schemaName: 'FileList',
        path: '/nodes/',
        method: 'GET',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schemaName).toBe('FileList');
    });

    it('should prioritize property over path/method', async () => {
      const results = searchSchemas(loader, {
        property: 'username',
        path: '/files/',
        method: 'GET',
      });

      // Should search by property, not by path/method
      expect(results.length).toBeGreaterThan(0);
      // Results should be from Users endpoints which have 'username' property
      const hasUsername = results.some((r) =>
        r.schema.properties?.username || r.schema.items?.properties?.username
      );
      expect(hasUsername).toBe(true);
    });
  });
});
