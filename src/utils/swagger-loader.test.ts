import { describe, it, expect } from 'vitest';
import { SwaggerLoader } from './swagger-loader.js';
import { getMinimalFixturePath, getEdgeCasesFixturePath } from '../__mocks__/swagger-loader.mock.js';

describe('SwaggerLoader', () => {
  describe('load', () => {
    it('should load swagger spec from file', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const spec = loader.getSpec();
      expect(spec.swagger).toBe('2.0');
      expect(spec.info.title).toBe('Test API');
    });

    it('should throw error when file does not exist', async () => {
      const loader = new SwaggerLoader();
      await expect(loader.load('/nonexistent/path.json')).rejects.toThrow();
    });

    it('should build all indexes after loading', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      expect(() => loader.getEndpointIndex()).not.toThrow();
      expect(() => loader.getSchemaIndex()).not.toThrow();
      expect(() => loader.getFulltextIndex()).not.toThrow();
    });
  });

  describe('getSpec', () => {
    it('should throw error when spec not loaded', () => {
      const loader = new SwaggerLoader();
      expect(() => loader.getSpec()).toThrow('Swagger spec not loaded. Call load() first.');
    });
  });

  describe('getEndpointIndex', () => {
    it('should throw error when indexes not built', () => {
      const loader = new SwaggerLoader();
      expect(() => loader.getEndpointIndex()).toThrow('Indexes not built. Call load() first.');
    });

    it('should return endpoint index with paths, tags, and operationIds', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getEndpointIndex();
      expect(index.paths).toBeInstanceOf(Map);
      expect(index.tags).toBeInstanceOf(Map);
      expect(index.operationIds).toBeInstanceOf(Map);
    });

    it('should index paths correctly', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getEndpointIndex();
      expect(index.paths.has('/files/')).toBe(true);
      expect(index.paths.has('/files/{file_id}/')).toBe(true);
      expect(index.paths.has('/nodes/')).toBe(true);
    });

    it('should index methods in uppercase', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getEndpointIndex();
      const fileMethods = index.paths.get('/files/{file_id}/');
      expect(fileMethods?.has('GET')).toBe(true);
      expect(fileMethods?.has('PATCH')).toBe(true);
      expect(fileMethods?.has('DELETE')).toBe(true);
    });

    it('should index tags correctly', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getEndpointIndex();
      expect(index.tags.has('Files')).toBe(true);
      expect(index.tags.has('Nodes')).toBe(true);
      expect(index.tags.has('Users')).toBe(true);

      const filesEndpoints = index.tags.get('Files')!;
      expect(filesEndpoints.length).toBeGreaterThan(0);
    });

    it('should index operationIds correctly', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getEndpointIndex();
      expect(index.operationIds.has('files_list')).toBe(true);
      expect(index.operationIds.has('files_read')).toBe(true);
      expect(index.operationIds.has('nodes_list')).toBe(true);

      const filesListOp = index.operationIds.get('files_list');
      expect(filesListOp?.path).toBe('/files/');
      expect(filesListOp?.method).toBe('GET');
    });
  });

  describe('getSchemaIndex', () => {
    it('should throw error when indexes not built', () => {
      const loader = new SwaggerLoader();
      expect(() => loader.getSchemaIndex()).toThrow('Indexes not built. Call load() first.');
    });

    it('should index schemas by name', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getSchemaIndex();
      expect(index.byName.has('FileList')).toBe(true);
      expect(index.byName.has('File')).toBe(true);
      expect(index.byName.has('NodeList')).toBe(true);
    });

    it('should index schemas by property', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getSchemaIndex();
      expect(index.byProperty.has('id')).toBe(true);
      expect(index.byProperty.has('name')).toBe(true);
    });

    it('should index nested properties from array items', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getEdgeCasesFixturePath());

      const index = loader.getSchemaIndex();
      // itemProp is inside items.properties
      expect(index.byProperty.has('itemProp')).toBe(true);
    });

    // P0: Test for potential infinite loop with self-referencing schemas
    it('should handle deeply nested schemas without infinite loop', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getEdgeCasesFixturePath());

      // If this completes without timeout, the test passes
      const index = loader.getSchemaIndex();
      // Note: Current implementation only indexes top-level properties,
      // not recursively nested properties within properties.
      // 'level1' should be indexed as it's a top-level property
      expect(index.byProperty.has('level1')).toBe(true);
    });
  });

  describe('getFulltextIndex', () => {
    it('should throw error when indexes not built', () => {
      const loader = new SwaggerLoader();
      expect(() => loader.getFulltextIndex()).toThrow('Indexes not built. Call load() first.');
    });

    it('should index words from summary and description', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getFulltextIndex();
      // "List all files" -> ["list", "all", "files"] (after filtering 3+ chars)
      expect(index.words.has('list')).toBe(true);
      expect(index.words.has('files')).toBe(true);
    });

    it('should index parameter names and descriptions', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getFulltextIndex();
      // "page" parameter with description "Page number for pagination"
      expect(index.words.has('page')).toBe(true);
      expect(index.words.has('pagination')).toBe(true);
    });

    it('should create document entries for each endpoint', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getMinimalFixturePath());

      const index = loader.getFulltextIndex();
      expect(index.documents.has('GET:/files/')).toBe(true);
      expect(index.documents.has('GET:/files/{file_id}/')).toBe(true);
      expect(index.documents.has('PATCH:/files/{file_id}/')).toBe(true);
    });

    // P1: Test tokenizer behavior with short words
    it('should filter out words with 2 or fewer characters', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getEdgeCasesFixturePath());

      const index = loader.getFulltextIndex();
      // "OS API id" - "os" and "id" should be filtered (2 chars)
      expect(index.words.has('os')).toBe(false);
      expect(index.words.has('id')).toBe(false);
      // "api" has 3 chars, should be included
      expect(index.words.has('api')).toBe(true);
    });

    it('should handle special characters by replacing with spaces', async () => {
      const loader = new SwaggerLoader();
      await loader.load(getEdgeCasesFixturePath());

      const index = loader.getFulltextIndex();
      // "file-upload" -> "file upload" -> ["file", "upload"]
      expect(index.words.has('file')).toBe(true);
      expect(index.words.has('upload')).toBe(true);
    });
  });
});
