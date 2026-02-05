# OSF API MCP Server

A Model Context Protocol (MCP) server that provides efficient search capabilities for the OSF (Open Science Framework) API v2 Swagger specification. This server enables LLMs to quickly find relevant API endpoints, schemas, and documentation without consuming excessive tokens.

## Features

- **Endpoint Search**: Find API endpoints by path, HTTP method, operationId, or tag
- **Tag-based Search**: Browse endpoints grouped by categories/tags
- **Schema Search**: Discover data models and response schemas
- **Full-text Search**: Search across summaries, descriptions, and parameter documentation
- **Detailed Endpoint Info**: Get complete specifications for specific endpoints
- **Tag Listing**: View all available API categories and their descriptions

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "osf-api": {
      "command": "node",
      "args": ["/path/to/osf-api-mcp/dist/index.js"]
    }
  }
}
```

You can also add this server to `<project_root>/.mcp.json` to configure it with the project scope:

```json
{
  "mcpServers": {
    "osf-api-docs": {
      "command": "node",
      "args": ["/path/to/osf-api-mcp/dist/index.js"]
    }
  }
}
```

### Testing with MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

## Available Tools

### 1. search_endpoints

Search for API endpoints by various criteria.

**Parameters:**
- `path` (optional): Search for endpoints containing this path string
- `method` (optional): Filter by HTTP method (GET, POST, PATCH, DELETE, etc.)
- `operationId` (optional): Search by operation ID (partial match)
- `tag` (optional): Filter by tag name (partial match)
- `limit` (optional): Maximum number of results (default: 10)

**Example:**
```json
{
  "path": "/files",
  "method": "GET",
  "limit": 5
}
```

### 2. search_by_tag

Find all endpoints grouped by a specific tag/category.

**Parameters:**
- `tag` (required): Tag name to search for (partial match)
- `includeDescription` (optional): Include tag descriptions (default: false)

**Example:**
```json
{
  "tag": "Files",
  "includeDescription": true
}
```

### 3. search_schemas

Search for response schemas and data models.

**Parameters:**
- `schemaName` (optional): Schema/model name (e.g., "File", "Node")
- `property` (optional): Search schemas containing this property
- `path` (optional): Get schema for a specific endpoint
- `method` (optional): HTTP method (required if path is specified)

**Example:**
```json
{
  "schemaName": "File"
}
```

### 4. fulltext_search

Perform full-text search with relevance ranking.

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results (default: 10)

**Example:**
```json
{
  "query": "upload file storage",
  "limit": 5
}
```

### 5. get_endpoint_details

Get complete details for a specific endpoint.

**Parameters:**
- `path` (required): Exact endpoint path (e.g., "/files/{file_id}/")
- `method` (required): HTTP method (GET, POST, etc.)

**Example:**
```json
{
  "path": "/files/{file_id}/",
  "method": "GET"
}
```

### 6. list_tags

Get all available tags/categories with their descriptions.

**Parameters:** None

## API Specification

This server indexes the complete OSF API v2 specification:
- 250 API endpoints
- 40 tags/categories
- Comprehensive schema definitions
- Full parameter and response documentation

The specification file is located at [schema/osf_api/swagger.json](schema/osf_api/swagger.json).

## Architecture

### Project Structure

```
osf-api-mcp/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server implementation
│   ├── server.test.ts              # Server tests
│   ├── types.ts                    # TypeScript type definitions
│   ├── __mocks__/                  # Test mocks
│   │   └── swagger-loader.mock.ts
│   ├── search/                     # Search implementations
│   │   ├── endpoint-search.ts
│   │   ├── endpoint-search.test.ts
│   │   ├── tag-search.ts
│   │   ├── tag-search.test.ts
│   │   ├── schema-search.ts
│   │   ├── schema-search.test.ts
│   │   ├── fulltext-search.ts
│   │   └── fulltext-search.test.ts
│   └── utils/
│       ├── swagger-loader.ts       # Swagger spec loader & indexer
│       └── swagger-loader.test.ts
├── schema/
│   └── osf_api/
│       └── swagger.json            # OSF API specification
├── vitest.config.ts                # Vitest configuration
└── eslint.config.js                # ESLint configuration
```

### Performance

- **Startup time**: < 1 second (loads and indexes 3.1MB specification)
- **Memory usage**: < 50MB (including all indexes)
- **Search response**: < 100ms for most queries

The server builds in-memory indexes at startup:
- Path-based endpoint index
- Tag-to-endpoint mapping
- Schema definitions by name and property
- Full-text inverted index for fast text search

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Run Directly

```bash
npm run dev
```

### Testing

Run tests with Vitest:

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

Coverage thresholds are configured at 80% for statements, functions, and lines, and 75% for branches.

### Linting

Run ESLint:

```bash
npm run lint          # Check for linting issues
npm run lint:fix      # Fix linting issues automatically
```

## License

Apache-2.0

## About OSF

The Open Science Framework (OSF) is a free, open-source service maintained by the Center for Open Science. It provides a collaborative platform for research project management, file storage, and scholarly publishing.

For more information about the OSF API, visit:
- API Documentation: https://developer.osf.io/
- OSF Website: https://osf.io/
- Support: https://help.osf.io/
