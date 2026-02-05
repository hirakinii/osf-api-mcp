import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SwaggerLoader } from './utils/swagger-loader.js';
import { searchEndpoints, type EndpointSearchParams } from './search/endpoint-search.js';
import { searchByTag, type TagSearchParams } from './search/tag-search.js';
import { searchSchemas, type SchemaSearchParams } from './search/schema-search.js';
import { fulltextSearch, type FulltextSearchParams } from './search/fulltext-search.js';

interface GetEndpointDetailsParams {
  path: string;
  method: string;
}

export class OsfApiMcpServer {
  private server: Server;
  private loader: SwaggerLoader;

  constructor() {
    this.server = new Server(
      {
        name: 'osf-api-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.loader = new SwaggerLoader();
    this.setupToolHandlers();
  }

  async initialize(): Promise<void> {
    await this.loader.load();
    console.error('OSF API MCP Server initialized');
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_endpoints':
            return this.handleSearchEndpoints(args || {});
          case 'search_by_tag':
            return this.handleSearchByTag(args || {});
          case 'search_schemas':
            return this.handleSearchSchemas(args || {});
          case 'fulltext_search':
            return this.handleFulltextSearch(args || {});
          case 'get_endpoint_details':
            return this.handleGetEndpointDetails(args || {});
          case 'list_tags':
            return this.handleListTags();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'search_endpoints',
        description: 'Search for API endpoints by path, HTTP method, operationId, or tag. Returns a list of matching endpoints with their details.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Search for endpoints containing this path string (e.g., "/files", "/nodes")',
            },
            method: {
              type: 'string',
              description: 'Filter by HTTP method (GET, POST, PATCH, DELETE, etc.)',
            },
            operationId: {
              type: 'string',
              description: 'Search by operation ID (partial match)',
            },
            tag: {
              type: 'string',
              description: 'Filter by tag name (partial match)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
        },
      },
      {
        name: 'search_by_tag',
        description: 'Search for endpoints grouped by tags/categories. Returns all endpoints belonging to matching tags.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name to search for (partial match)',
            },
            includeDescription: {
              type: 'boolean',
              description: 'Include the tag description in results',
              default: false,
            },
          },
          required: ['tag'],
        },
      },
      {
        name: 'search_schemas',
        description: 'Search for response schemas and data models. Can search by schema name, property name, or specific endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            schemaName: {
              type: 'string',
              description: 'Search by schema/model name (e.g., "File", "Node", "User")',
            },
            property: {
              type: 'string',
              description: 'Search schemas containing this property name',
            },
            path: {
              type: 'string',
              description: 'Get schema for a specific endpoint path',
            },
            method: {
              type: 'string',
              description: 'HTTP method (required if path is specified)',
            },
          },
        },
      },
      {
        name: 'fulltext_search',
        description: 'Perform full-text search across endpoint summaries, descriptions, and parameter descriptions. Results are ranked by relevance.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_endpoint_details',
        description: 'Get complete details for a specific API endpoint, including parameters, responses, schemas, and examples.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The exact endpoint path (e.g., "/files/{file_id}/")',
            },
            method: {
              type: 'string',
              description: 'The HTTP method (GET, POST, etc.)',
            },
          },
          required: ['path', 'method'],
        },
      },
      {
        name: 'list_tags',
        description: 'Get a list of all available tags/categories with their descriptions, grouped by tag groups.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  private handleSearchEndpoints(args: Record<string, unknown>) {
    const results = searchEndpoints(this.loader, args as EndpointSearchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private handleSearchByTag(args: Record<string, unknown>) {
    if (!args.tag) {
      throw new Error('tag parameter is required');
    }
    const results = searchByTag(this.loader, args as unknown as TagSearchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private handleSearchSchemas(args: Record<string, unknown>) {
    const results = searchSchemas(this.loader, args as SchemaSearchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private handleFulltextSearch(args: Record<string, unknown>) {
    if (!args.query) {
      throw new Error('query parameter is required');
    }
    const results = fulltextSearch(this.loader, args as unknown as FulltextSearchParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private handleGetEndpointDetails(args: Record<string, unknown>) {
    if (!args.path || !args.method) {
      throw new Error('path and method parameters are required');
    }

    const typedArgs = args as unknown as GetEndpointDetailsParams;
    const index = this.loader.getEndpointIndex();
    const operation = index.paths.get(typedArgs.path)?.get(typedArgs.method.toUpperCase());

    if (!operation) {
      throw new Error(`Endpoint not found: ${typedArgs.method.toUpperCase()} ${typedArgs.path}`);
    }

    const result = {
      path: typedArgs.path,
      method: typedArgs.method.toUpperCase(),
      summary: operation.summary,
      description: operation.description,
      operationId: operation.operationId,
      tags: operation.tags,
      parameters: operation.parameters,
      responses: operation.responses,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private handleListTags() {
    const spec = this.loader.getSpec();
    const tagGroups = spec['x-tagGroups'] || [];

    const result = {
      tagGroups: tagGroups.map(group => ({
        name: group.name,
        tags: group.tags.map(tagName => {
          const tagInfo = spec.tags.find(t => t.name === tagName);
          return {
            name: tagName,
            description: tagInfo?.description,
          };
        }),
      })),
      allTags: spec.tags.map(tag => ({
        name: tag.name,
        description: tag.description,
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OSF API MCP Server running on stdio');
  }
}
