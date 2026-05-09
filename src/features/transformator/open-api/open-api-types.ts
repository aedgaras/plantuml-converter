export type OpenApiPrimitiveType = "string" | "number" | "integer" | "boolean";

export type OpenApiSourceMetadata = {
  kind: "class" | "enum" | "attribute" | "relation" | "operation" | "parameter";
  name: string;
  member?: string;
};

export type OpenApiSchemaMetadata = {
  description?: string;
  nullable?: boolean;
  example?: string | number | boolean;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minLength?: number;
  maxLength?: number;
  "x-source"?: OpenApiSourceMetadata;
};

export type OpenApiReferenceSchema = OpenApiSchemaMetadata & {
  $ref: string;
};

export type OpenApiPrimitiveSchema = OpenApiSchemaMetadata & {
  type: OpenApiPrimitiveType;
  format?: string;
  enum?: string[];
};

export type OpenApiArraySchema = OpenApiSchemaMetadata & {
  type: "array";
  items: OpenApiSchema;
  minItems?: number;
  maxItems?: number;
};

export type OpenApiMethodExtension = {
  name: string;
  access: string;
  returnType?: string;
};

export type OpenApiObjectSchema = OpenApiSchemaMetadata & {
  type: "object";
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  additionalProperties?: OpenApiSchema;
  "x-methods"?: OpenApiMethodExtension[];
};

export type OpenApiAllOfSchema = OpenApiSchemaMetadata & {
  allOf: OpenApiSchema[];
};

export type OpenApiSchema =
  | OpenApiReferenceSchema
  | OpenApiPrimitiveSchema
  | OpenApiArraySchema
  | OpenApiObjectSchema
  | OpenApiAllOfSchema;

export type OpenApiComponents = {
  schemas: Record<string, OpenApiSchema>;
  responses?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  requestBodies?: Record<string, unknown>;
};

export type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, OpenApiPathItem>;
  components: OpenApiComponents;
};

export type OpenApiPathItem = {
  summary?: string;
  description?: string;
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
  patch?: OpenApiOperation;
  head?: OpenApiOperation;
  options?: OpenApiOperation;
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  "x-source"?: OpenApiSourceMetadata;
};

export type OpenApiParameter = {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
  "x-source"?: OpenApiSourceMetadata;
};

export type OpenApiRequestBody = {
  required?: boolean;
  content: Record<
    string,
    {
      schema: OpenApiSchema;
    }
  >;
};

export type OpenApiResponse = {
  description: string;
  content?: Record<
    string,
    {
      schema: OpenApiSchema;
    }
  >;
};
