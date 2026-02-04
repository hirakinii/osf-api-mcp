import type { SwaggerLoader } from '../utils/swagger-loader.js';
import type { EndpointResult } from '../types.js';

export interface EndpointSearchParams {
  path?: string;
  method?: string;
  operationId?: string;
  tag?: string;
  limit?: number;
}

export function searchEndpoints(
  loader: SwaggerLoader,
  params: EndpointSearchParams
): EndpointResult[] {
  const { path, method, operationId, tag, limit = 10 } = params;
  const index = loader.getEndpointIndex();
  const results: EndpointResult[] = [];

  // Search by operationId if provided
  if (operationId) {
    const normalizedOpId = operationId.toLowerCase();
    for (const [opId, location] of index.operationIds.entries()) {
      if (opId.toLowerCase().includes(normalizedOpId)) {
        const operation = index.paths.get(location.path)?.get(location.method);
        if (operation) {
          results.push({
            path: location.path,
            method: location.method,
            summary: operation.summary,
            description: operation.description,
            operationId: operation.operationId,
            tags: operation.tags,
            parameters: operation.parameters,
          });
        }
      }
    }
  } else {
    // Search by path, method, and tag
    for (const [pathStr, methods] of index.paths.entries()) {
      // Filter by path if provided
      if (path && !pathStr.toLowerCase().includes(path.toLowerCase())) {
        continue;
      }

      for (const [methodStr, operation] of methods.entries()) {
        // Filter by method if provided
        if (method && methodStr.toUpperCase() !== method.toUpperCase()) {
          continue;
        }

        // Filter by tag if provided
        if (tag) {
          const normalizedTag = tag.toLowerCase();
          if (!operation.tags?.some(t => t.toLowerCase().includes(normalizedTag))) {
            continue;
          }
        }

        results.push({
          path: pathStr,
          method: methodStr,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          tags: operation.tags,
          parameters: operation.parameters,
        });
      }
    }
  }

  return results.slice(0, limit);
}
