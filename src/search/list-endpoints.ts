import { SwaggerLoader } from '../utils/swagger-loader.js';

export interface ListEndpointsParams {
  limit?: number;
  offset?: number;
}

export interface EndpointListItem {
  path: string;
  method: string;
  summary?: string;
  operationId?: string;
  tags?: string[];
}

export function listEndpoints(
  loader: SwaggerLoader,
  params: ListEndpointsParams
): EndpointListItem[] {
  const index = loader.getEndpointIndex();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const results: EndpointListItem[] = [];

  for (const [path, methods] of index.paths) {
    for (const [method, operation] of methods) {
      results.push({
        path,
        method: method.toUpperCase(),
        summary: operation.summary,
        operationId: operation.operationId,
        tags: operation.tags,
      });
    }
  }

  // Sort by path, then by method
  results.sort((a, b) =>
    a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
  );

  return results.slice(offset, offset + limit);
}
