export type OpenApiPrimitiveType = "string" | "number" | "integer" | "boolean";

export type OpenApiReferenceSchema = {
  $ref: string;
};

export type OpenApiPrimitiveSchema = {
  type: OpenApiPrimitiveType;
  format?: string;
  enum?: string[];
  description?: string;
};

export type OpenApiArraySchema = {
  type: "array";
  items: OpenApiSchema;
  minItems?: number;
  maxItems?: number;
  description?: string;
};

export type OpenApiObjectSchema = {
  type: "object";
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  description?: string;
};

export type OpenApiAllOfSchema = {
  allOf: OpenApiSchema[];
  description?: string;
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
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
};

export type OpenApiParameter = {
  name: string;
  in: "query" | "path";
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
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
