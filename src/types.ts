// Swagger 2.0 Specification Types
export interface SwaggerSpec {
  swagger: string;
  info: SwaggerInfo;
  host: string;
  schemes: string[];
  basePath: string;
  'x-tagGroups'?: TagGroup[];
  tags: Tag[];
  paths: Record<string, PathItem>;
}

export interface SwaggerInfo {
  title: string;
  description: string;
  version: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
}

export interface Contact {
  name?: string;
  email?: string;
  url?: string;
}

export interface License {
  name: string;
  url?: string;
}

export interface TagGroup {
  name: string;
  tags: string[];
}

export interface Tag {
  name: string;
  description?: string;
  'x-traitTag'?: boolean;
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  head?: Operation;
  options?: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  responses?: Record<string, Response>;
  'x-response-schema'?: string;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'formData' | 'body';
  description?: string;
  required?: boolean;
  type?: string;
  schema?: Schema;
}

export interface Response {
  description: string;
  schema?: Schema;
  examples?: Record<string, any>;
}

export interface Schema {
  type?: string;
  format?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  title?: string;
  description?: string;
  readOnly?: boolean;
  required?: string[];
  $ref?: string;
}

// Search Result Types
export interface EndpointResult {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
}

export interface TagSearchResult {
  tagName: string;
  description?: string;
  endpoints: EndpointResult[];
}

export interface SchemaResult {
  schemaName?: string;
  path?: string;
  method?: string;
  schema: Schema;
}

export interface FulltextSearchResult {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  score: number;
  matchedFields: string[];
}

// Index Types
export interface EndpointIndex {
  paths: Map<string, Map<string, Operation>>;
  tags: Map<string, EndpointResult[]>;
  operationIds: Map<string, { path: string; method: string }>;
}

export interface SchemaIndex {
  byName: Map<string, SchemaResult[]>;
  byProperty: Map<string, SchemaResult[]>;
}

export interface FulltextIndex {
  words: Map<string, Set<string>>;
  documents: Map<string, {
    path: string;
    method: string;
    content: string;
    summary?: string;
    description?: string;
  }>;
}
