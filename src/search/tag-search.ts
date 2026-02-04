import type { SwaggerLoader } from '../utils/swagger-loader.js';
import type { TagSearchResult } from '../types.js';

export interface TagSearchParams {
  tag: string;
  includeDescription?: boolean;
}

export function searchByTag(
  loader: SwaggerLoader,
  params: TagSearchParams
): TagSearchResult[] {
  const { tag, includeDescription = false } = params;
  const spec = loader.getSpec();
  const index = loader.getEndpointIndex();
  const results: TagSearchResult[] = [];

  const normalizedTag = tag.toLowerCase();

  for (const [tagName, endpoints] of index.tags.entries()) {
    if (tagName.toLowerCase().includes(normalizedTag)) {
      let description: string | undefined;

      if (includeDescription) {
        const tagInfo = spec.tags.find(t => t.name === tagName);
        description = tagInfo?.description;
      }

      results.push({
        tagName,
        description,
        endpoints,
      });
    }
  }

  return results;
}
