import type { SwaggerLoader } from '../utils/swagger-loader.js';
import type { SchemaResult } from '../types.js';

export interface SchemaSearchParams {
  schemaName?: string;
  property?: string;
  path?: string;
  method?: string;
}

export function searchSchemas(
  loader: SwaggerLoader,
  params: SchemaSearchParams
): SchemaResult[] {
  const { schemaName, property, path, method } = params;
  const index = loader.getSchemaIndex();
  const results: SchemaResult[] = [];

  if (schemaName) {
    // Search by schema name
    const normalizedName = schemaName.toLowerCase();
    for (const [name, schemas] of index.byName.entries()) {
      if (name.toLowerCase().includes(normalizedName)) {
        results.push(...schemas);
      }
    }
  } else if (property) {
    // Search by property name
    const normalizedProp = property.toLowerCase();
    for (const [propName, schemas] of index.byProperty.entries()) {
      if (propName.toLowerCase().includes(normalizedProp)) {
        results.push(...schemas);
      }
    }
  } else if (path && method) {
    // Search by specific endpoint
    const pathIndex = loader.getEndpointIndex();
    const operation = pathIndex.paths.get(path)?.get(method.toUpperCase());

    if (operation?.responses) {
      for (const [, response] of Object.entries(operation.responses)) {
        if (response.schema) {
          results.push({
            schemaName: operation['x-response-schema'] || response.schema.title,
            path,
            method: method.toUpperCase(),
            schema: response.schema,
          });
        }
      }
    }
  }

  // Remove duplicates
  const uniqueResults = new Map<string, SchemaResult>();
  for (const result of results) {
    const key = `${result.path}:${result.method}:${result.schemaName}`;
    if (!uniqueResults.has(key)) {
      uniqueResults.set(key, result);
    }
  }

  return Array.from(uniqueResults.values());
}
