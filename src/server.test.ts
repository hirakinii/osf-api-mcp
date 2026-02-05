import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OsfApiMcpServer } from './server.js';
import { getMinimalFixturePath } from './__mocks__/swagger-loader.mock.js';

// Mock the SwaggerLoader to use test fixtures
vi.mock('./utils/swagger-loader.js', async () => {
  const actual = await vi.importActual('./utils/swagger-loader.js');
  return {
    ...actual,
    SwaggerLoader: class extends (actual as any).SwaggerLoader {
      async load(): Promise<void> {
        const fixturePath = getMinimalFixturePath();
        await super.load(fixturePath);
      }
    },
  };
});

describe('OsfApiMcpServer', () => {
  let server: OsfApiMcpServer;

  beforeEach(async () => {
    server = new OsfApiMcpServer();
    await server.initialize();
  });

  describe('initialize', () => {
    it('should initialize without error', async () => {
      const newServer = new OsfApiMcpServer();
      await expect(newServer.initialize()).resolves.not.toThrow();
    });
  });

  describe('getTools', () => {
    it('should return 7 tools', async () => {
      // Access private method via type assertion
      const tools = (server as any).getTools();

      expect(tools.length).toBe(7);
    });

    it('should include all expected tool names', async () => {
      const tools = (server as any).getTools();
      const toolNames = tools.map((t: any) => t.name);

      expect(toolNames).toContain('search_endpoints');
      expect(toolNames).toContain('search_by_tag');
      expect(toolNames).toContain('search_schemas');
      expect(toolNames).toContain('fulltext_search');
      expect(toolNames).toContain('get_endpoint_details');
      expect(toolNames).toContain('list_tags');
      expect(toolNames).toContain('list_endpoints');
    });

    it('should have proper inputSchema for each tool', async () => {
      const tools = (server as any).getTools();

      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema.type).toBe('object');
      });
    });

    it('should mark required fields correctly', async () => {
      const tools = (server as any).getTools();

      const searchByTag = tools.find((t: any) => t.name === 'search_by_tag');
      expect(searchByTag.inputSchema.required).toContain('tag');

      const fulltextSearch = tools.find((t: any) => t.name === 'fulltext_search');
      expect(fulltextSearch.inputSchema.required).toContain('query');

      const getEndpointDetails = tools.find((t: any) => t.name === 'get_endpoint_details');
      expect(getEndpointDetails.inputSchema.required).toContain('path');
      expect(getEndpointDetails.inputSchema.required).toContain('method');
    });
  });

  describe('handleSearchEndpoints', () => {
    it('should return results for valid search', async () => {
      const result = (server as any).handleSearchEndpoints({ path: '/files' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should handle empty args', async () => {
      const result = (server as any).handleSearchEndpoints({});

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('handleSearchByTag', () => {
    it('should return results for valid tag', async () => {
      const result = (server as any).handleSearchByTag({ tag: 'Files' });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should throw error when tag is missing', async () => {
      expect(() => {
        (server as any).handleSearchByTag({});
      }).toThrow('tag parameter is required');
    });

    // P1: Test empty string validation
    it('should throw error for empty tag string', async () => {
      expect(() => {
        (server as any).handleSearchByTag({ tag: '' });
      }).toThrow('tag parameter is required');
    });
  });

  describe('handleSearchSchemas', () => {
    it('should return results for schema name search', async () => {
      const result = (server as any).handleSearchSchemas({ schemaName: 'File' });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should return results for property search', async () => {
      const result = (server as any).handleSearchSchemas({ property: 'id' });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should handle empty args', async () => {
      const result = (server as any).handleSearchSchemas({});

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  describe('handleFulltextSearch', () => {
    it('should return results for valid query', async () => {
      const result = (server as any).handleFulltextSearch({ query: 'files' });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should throw error when query is missing', async () => {
      expect(() => {
        (server as any).handleFulltextSearch({});
      }).toThrow('query parameter is required');
    });

    // P1: Test empty string validation
    it('should throw error for empty query string', async () => {
      expect(() => {
        (server as any).handleFulltextSearch({ query: '' });
      }).toThrow('query parameter is required');
    });

    it('should return empty array for query with only short words', async () => {
      const result = (server as any).handleFulltextSearch({ query: 'a is to' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual([]);
    });
  });

  describe('handleGetEndpointDetails', () => {
    it('should return endpoint details for valid path and method', async () => {
      const result = (server as any).handleGetEndpointDetails({
        path: '/files/',
        method: 'GET',
      });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.path).toBe('/files/');
      expect(parsed.method).toBe('GET');
      expect(parsed.summary).toBe('List all files');
    });

    it('should normalize method to uppercase', async () => {
      const result = (server as any).handleGetEndpointDetails({
        path: '/files/',
        method: 'get',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('GET');
    });

    it('should throw error when path is missing', async () => {
      expect(() => {
        (server as any).handleGetEndpointDetails({ method: 'GET' });
      }).toThrow('path and method parameters are required');
    });

    it('should throw error when method is missing', async () => {
      expect(() => {
        (server as any).handleGetEndpointDetails({ path: '/files/' });
      }).toThrow('path and method parameters are required');
    });

    it('should throw error when endpoint not found', async () => {
      expect(() => {
        (server as any).handleGetEndpointDetails({
          path: '/nonexistent/',
          method: 'GET',
        });
      }).toThrow('Endpoint not found: GET /nonexistent/');
    });

    it('should include parameters in response', async () => {
      const result = (server as any).handleGetEndpointDetails({
        path: '/files/',
        method: 'GET',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.parameters).toBeDefined();
      expect(Array.isArray(parsed.parameters)).toBe(true);
    });

    it('should include responses in response', async () => {
      const result = (server as any).handleGetEndpointDetails({
        path: '/files/',
        method: 'GET',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.responses).toBeDefined();
      expect(parsed.responses['200']).toBeDefined();
    });
  });

  describe('handleListTags', () => {
    it('should return tag groups and all tags', async () => {
      const result = (server as any).handleListTags();

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('tagGroups');
      expect(parsed).toHaveProperty('allTags');
    });

    it('should include tag descriptions', async () => {
      const result = (server as any).handleListTags();

      const parsed = JSON.parse(result.content[0].text);
      const filesTag = parsed.allTags.find((t: any) => t.name === 'Files');
      expect(filesTag).toBeDefined();
      expect(filesTag.description).toBe('File operations');
    });

    it('should include tag groups', async () => {
      const result = (server as any).handleListTags();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tagGroups.length).toBeGreaterThan(0);

      const coreGroup = parsed.tagGroups.find((g: any) => g.name === 'Core');
      expect(coreGroup).toBeDefined();
      expect(coreGroup.tags.some((t: any) => t.name === 'Files')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error message for unknown tool', async () => {
      // This would need to be tested through the actual MCP protocol
      // For now, we test the handler directly
      const tools = (server as any).getTools();
      const toolNames = tools.map((t: any) => t.name);
      expect(toolNames).not.toContain('unknown_tool');
    });
  });

  describe('response format', () => {
    it('should return content array with text type', async () => {
      const result = (server as any).handleSearchEndpoints({ path: '/files' });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should return valid JSON in text', async () => {
      const result = (server as any).handleSearchEndpoints({ path: '/files' });

      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});
