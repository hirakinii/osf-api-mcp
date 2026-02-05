import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  SwaggerSpec,
  EndpointIndex,
  SchemaIndex,
  FulltextIndex,
  EndpointResult,
  SchemaResult,
  Operation,
  Schema,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SwaggerLoader {
  private spec: SwaggerSpec | null = null;
  private endpointIndex: EndpointIndex | null = null;
  private schemaIndex: SchemaIndex | null = null;
  private fulltextIndex: FulltextIndex | null = null;

  async load(swaggerPath?: string): Promise<void> {
    const filePath = swaggerPath || join(__dirname, '../../schema/osf_api/swagger.json');
    const content = await readFile(filePath, 'utf-8');
    this.spec = JSON.parse(content);
    this.buildIndexes();
  }

  getSpec(): SwaggerSpec {
    if (!this.spec) {
      throw new Error('Swagger spec not loaded. Call load() first.');
    }
    return this.spec;
  }

  getEndpointIndex(): EndpointIndex {
    if (!this.endpointIndex) {
      throw new Error('Indexes not built. Call load() first.');
    }
    return this.endpointIndex;
  }

  getSchemaIndex(): SchemaIndex {
    if (!this.schemaIndex) {
      throw new Error('Indexes not built. Call load() first.');
    }
    return this.schemaIndex;
  }

  getFulltextIndex(): FulltextIndex {
    if (!this.fulltextIndex) {
      throw new Error('Indexes not built. Call load() first.');
    }
    return this.fulltextIndex;
  }

  private buildIndexes(): void {
    if (!this.spec) {
      throw new Error('Spec not loaded');
    }

    this.endpointIndex = this.buildEndpointIndex();
    this.schemaIndex = this.buildSchemaIndex();
    this.fulltextIndex = this.buildFulltextIndex();
  }

  private buildEndpointIndex(): EndpointIndex {
    const paths = new Map<string, Map<string, Operation>>();
    const tags = new Map<string, EndpointResult[]>();
    const operationIds = new Map<string, { path: string; method: string }>();

    for (const [path, pathItem] of Object.entries(this.spec!.paths)) {
      const methodMap = new Map<string, Operation>();

      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const) {
        const operation = pathItem[method];
        if (operation) {
          methodMap.set(method.toUpperCase(), operation);

          // Index by tags
          if (operation.tags) {
            for (const tag of operation.tags) {
              if (!tags.has(tag)) {
                tags.set(tag, []);
              }
              tags.get(tag)!.push({
                path,
                method: method.toUpperCase(),
                summary: operation.summary,
                description: operation.description,
                operationId: operation.operationId,
                tags: operation.tags,
                parameters: operation.parameters,
              });
            }
          }

          // Index by operationId
          if (operation.operationId) {
            operationIds.set(operation.operationId, { path, method: method.toUpperCase() });
          }
        }
      }

      if (methodMap.size > 0) {
        paths.set(path, methodMap);
      }
    }

    return { paths, tags, operationIds };
  }

  private buildSchemaIndex(): SchemaIndex {
    const byName = new Map<string, SchemaResult[]>();
    const byProperty = new Map<string, SchemaResult[]>();

    for (const [path, pathItem] of Object.entries(this.spec!.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const) {
        const operation = pathItem[method];
        if (operation?.responses) {
          for (const [_statusCode, response] of Object.entries(operation.responses)) {
            if (response.schema) {
              const schemaName = operation['x-response-schema'] || response.schema.title;
              const schemaResult: SchemaResult = {
                schemaName,
                path,
                method: method.toUpperCase(),
                schema: response.schema,
              };

              // Index by schema name
              if (schemaName) {
                if (!byName.has(schemaName)) {
                  byName.set(schemaName, []);
                }
                byName.get(schemaName)!.push(schemaResult);
              }

              // Index by property names
              this.indexSchemaProperties(response.schema, schemaResult, byProperty);
            }
          }
        }
      }
    }

    return { byName, byProperty };
  }

  private indexSchemaProperties(
    schema: Schema,
    schemaResult: SchemaResult,
    byProperty: Map<string, SchemaResult[]>
  ): void {
    if (schema.properties) {
      for (const propName of Object.keys(schema.properties)) {
        if (!byProperty.has(propName)) {
          byProperty.set(propName, []);
        }
        byProperty.get(propName)!.push(schemaResult);
      }
    }

    if (schema.items) {
      this.indexSchemaProperties(schema.items, schemaResult, byProperty);
    }
  }

  private buildFulltextIndex(): FulltextIndex {
    const words = new Map<string, Set<string>>();
    const documents = new Map<string, {
      path: string;
      method: string;
      content: string;
      summary?: string;
      description?: string;
    }>();

    for (const [path, pathItem] of Object.entries(this.spec!.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const) {
        const operation = pathItem[method];
        if (operation) {
          const docId = `${method.toUpperCase()}:${path}`;
          const contentParts: string[] = [];

          if (operation.summary) contentParts.push(operation.summary);
          if (operation.description) contentParts.push(operation.description);
          if (operation.parameters) {
            for (const param of operation.parameters) {
              if (param.description) contentParts.push(param.description);
              contentParts.push(param.name);
            }
          }

          const content = contentParts.join(' ');
          documents.set(docId, {
            path,
            method: method.toUpperCase(),
            content,
            summary: operation.summary,
            description: operation.description,
          });

          // Tokenize and index words
          const tokens = this.tokenize(content);
          for (const token of tokens) {
            if (!words.has(token)) {
              words.set(token, new Set());
            }
            words.get(token)!.add(docId);
          }
        }
      }
    }

    return { words, documents };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
}
