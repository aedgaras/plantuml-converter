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
};

export type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, unknown>;
  components: OpenApiComponents;
};
