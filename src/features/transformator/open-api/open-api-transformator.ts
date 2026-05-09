import {
  UMLAttribute,
  UMLAttributeAnnotations,
  UMLCardinality,
  UMLClassLike,
  UMLDiagram,
  UMLEnum,
  UMLMethod,
  UMLRelation,
} from "../plant-uml/plant-uml-types";
import {
  humanizeName,
  normalizeOperationId,
  normalizePathSegment,
  normalizePropertyName,
  normalizeRoutePath,
} from "../shared/naming-rules";
import {
  TransformDiagnostic,
  TransformOptions,
  TransformResult,
} from "../shared/transform-diagnostics";
import { applyDiagramRules } from "../shared/transform-rules";
import {
  OpenApiArraySchema,
  OpenApiDocument,
  OpenApiObjectSchema,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiResponse,
  OpenApiSchema,
} from "./open-api-types";

type MutableSchema = {
  name: string;
  properties: Record<string, OpenApiSchema>;
  required: Set<string>;
  description?: string;
  methods?: UMLMethod[];
};

type DiagramCollections = {
  classes: UMLClassLike[];
  interfaces: UMLClassLike[];
  enums: UMLEnum[];
  relations: UMLRelation[];
};

type ParameterLocation = "path" | "query" | "header" | "cookie";

type ParameterDefinition = {
  name: string;
  in: ParameterLocation;
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
  sourceName?: string;
};

type TransformContext = {
  diagnostics: TransformDiagnostic[];
};

const PRIMITIVE_TYPE_MAP: Record<
  string,
  { type: "string" | "number" | "integer" | "boolean"; format?: string }
> = {
  string: { type: "string" },
  text: { type: "string" },
  uuid: { type: "string", format: "uuid" },
  date: { type: "string", format: "date" },
  datetime: { type: "string", format: "date-time" },
  "date-time": { type: "string", format: "date-time" },
  boolean: { type: "boolean" },
  bool: { type: "boolean" },
  int: { type: "integer", format: "int32" },
  integer: { type: "integer" },
  long: { type: "integer", format: "int64" },
  float: { type: "number", format: "float" },
  double: { type: "number", format: "double" },
  number: { type: "number" },
  decimal: { type: "number", format: "double" },
  email: { type: "string", format: "email" },
  timestamp: { type: "string", format: "date-time" },
};

const ERROR_SCHEMA_NAME = "ApiError";

/**
 * Converts the intermediate UML diagram into an OpenAPI document scaffold.
 */
export function transformToOpenApi(
  plantUMLDiagram: UMLDiagram,
  options?: TransformOptions,
): OpenApiDocument {
  return transformToOpenApiResult(plantUMLDiagram, options).document;
}

export function transformToOpenApiResult(
  plantUMLDiagram: UMLDiagram,
  options: TransformOptions = {},
): TransformResult<OpenApiDocument> {
  const context: TransformContext = {
    diagnostics: [],
  };
  const collections = extractDiagramCollections(
    applyDiagramRules(plantUMLDiagram),
  );
  collectDiagramDiagnostics(collections, context);
  const domainClasses = collections.classes.filter(
    (entity) => !hasStereotype(entity, "Path"),
  );

  const componentNames = collectComponentNames(
    domainClasses,
    collections.interfaces,
    collections.enums,
  );

  const classSchemas = buildClassSchemas(
    domainClasses,
    collections.interfaces,
    componentNames,
    collections.enums,
    context,
  );

  const inheritanceMap = new Map<string, string[]>();
  applyRelations(
    collections.relations,
    classSchemas,
    inheritanceMap,
    componentNames,
    context,
  );

  const schemas = buildComponentSchemas(
    classSchemas,
    inheritanceMap,
    collections.enums,
  );
  const errorRef = ensureErrorSchema(schemas);
  const explicitPaths = buildExplicitPaths(collections, errorRef, context);
  const fallbackPaths =
    Object.keys(explicitPaths).length > 0
      ? explicitPaths
      : buildCrudPaths(domainClasses, schemas, errorRef);

  const document: OpenApiDocument = {
    openapi: "3.1.0",
    info: {
      title: "PlantUML Generated API",
      version: "1.0.0",
      description: "OpenAPI schema generated from PlantUML diagram.",
    },
    paths: fallbackPaths,
    components: {
      schemas,
    },
  };

  const canonicalDocument = canonicalizeDocument(document);
  validateOpenApiDocument(canonicalDocument, context);

  if (
    options.mode === "strict" &&
    context.diagnostics.some((item) => item.level === "error")
  ) {
    const message = context.diagnostics
      .filter((item) => item.level === "error")
      .map((item) => `${item.code}: ${item.message}`)
      .join("\n");
    throw new Error(message);
  }

  return {
    document: canonicalDocument,
    diagnostics: canonicalizeDiagnostics(context.diagnostics),
  };
}

/**
 * Normalizes the optional arrays on the UML diagram into concrete collections.
 */
function extractDiagramCollections(diagram: UMLDiagram): DiagramCollections {
  return {
    classes: diagram.classes ?? [],
    interfaces: diagram.interfaces ?? [],
    enums: diagram.enums ?? [],
    relations: diagram.relations ?? [],
  };
}

function collectDiagramDiagnostics(
  collections: DiagramCollections,
  context: TransformContext,
) {
  const supportedClassStereotypes = new Set(["path", "requestbody", "response"]);
  const supportedParameterPrefixes = ["parameter", "get", "post", "put", "delete", "patch", "options", "head"];

  for (const entity of [...collections.classes, ...collections.interfaces]) {
    for (const stereotype of entity.stereotypes ?? []) {
      const normalized = stereotype.toLowerCase();
      const isSupported =
        supportedClassStereotypes.has(normalized) ||
        supportedParameterPrefixes.some((prefix) =>
          normalized === prefix || normalized.startsWith(`${prefix} `),
        );

      if (!isSupported) {
        pushDiagnostic(context, {
          level: "warning",
          code: "unsupported-stereotype",
          message: `Unsupported stereotype "${stereotype}" on ${entity.name}.`,
          source: {
            stage: "transform",
            entity: entity.name,
            stereotype,
          },
        });
      }
    }
  }

  for (const relation of collections.relations) {
    if (relation.toCardinality?.type === "custom") {
      pushDiagnostic(context, {
        level: "warning",
        code: "custom-cardinality",
        message: `Custom cardinality "${relation.toCardinality.raw}" on relation ${relation.from} -> ${relation.to}.`,
        source: {
          stage: "parse",
          relation: `${relation.from}->${relation.to}`,
        },
      });
    }
  }
}

/**
 * Builds a lookup of all component names so we can emit `$ref`s later.
 */
function collectComponentNames(
  classes: UMLClassLike[],
  interfaces: UMLClassLike[],
  enums: UMLEnum[],
): Set<string> {
  const componentNames = new Set<string>();
  for (const entity of [...classes, ...interfaces, ...enums]) {
    componentNames.add(entity.name);
  }
  return componentNames;
}

/**
 * Converts UML class/interface members into mutable schema drafts.
 */
function buildClassSchemas(
  classes: UMLClassLike[],
  interfaces: UMLClassLike[],
  componentNames: Set<string>,
  enums: UMLEnum[],
  context: TransformContext,
): Map<string, MutableSchema> {
  const classSchemas = new Map<string, MutableSchema>();
  for (const entity of [...classes, ...interfaces]) {
    const draft = ensureMutableSchema(classSchemas, entity.name);
    addAttributesToDraft(
      draft,
      entity.attributes,
      componentNames,
      enums,
      interfaces,
      classes,
      entity.name,
      context,
    );
    appendMethodsMetadata(draft, entity.methods);
  }
  return classSchemas;
}

const SUPPORTED_HTTP_METHODS = new Set<
  "get" | "post" | "put" | "delete" | "patch" | "options" | "head"
>(["get", "post", "put", "delete", "patch", "options", "head"]);

type HttpMethodKey =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

function buildExplicitPaths(
  collections: DiagramCollections,
  errorSchemaRef: string,
  context: TransformContext,
): Record<string, OpenApiPathItem> {
  const pathClasses = collections.classes.filter((entity) =>
    hasStereotype(entity, "Path"),
  );

  if (pathClasses.length === 0) {
    return {};
  }

  const requestBodyNames = new Set(
    collections.classes
      .filter((entity) => hasStereotype(entity, "RequestBody"))
      .map((entity) => entity.name),
  );
  const responseNames = new Set(
    collections.classes
      .filter((entity) => hasStereotype(entity, "Response"))
      .map((entity) => entity.name),
  );
  const parameterNames = new Set(
    collections.classes
      .filter(isParameterEntity)
      .map((entity) => entity.name),
  );
  const responseCandidates = new Set<string>([
    ...responseNames,
    ...collections.classes
      .filter(
        (entity) =>
          !hasStereotype(entity, "Path") &&
          !hasStereotype(entity, "RequestBody") &&
          !hasStereotype(entity, "Parameter"),
      )
      .map((entity) => entity.name),
    ...collections.interfaces.map((entity) => entity.name),
    ...collections.enums.map((entity) => entity.name),
  ]);
  const disallowedResponseTargets = new Set([
    ...requestBodyNames,
    ...parameterNames,
  ]);

  const paths: Record<string, OpenApiPathItem> = {};

  for (const pathClass of pathClasses) {
    const httpInfo = extractHttpDetails(pathClass.stereotypes);
    if (!httpInfo) {
      continue;
    }

    const methodKey = httpInfo.method.toLowerCase() as HttpMethodKey;
    if (!SUPPORTED_HTTP_METHODS.has(methodKey)) {
      continue;
    }

    const route = normalizeRoute(httpInfo.route);
    const pathItem: OpenApiPathItem = paths[route] ?? {};
    const parameterRelations = collections.relations.filter(
      (relation) =>
        relation.from === pathClass.name &&
        relation.to &&
        parameterNames.has(relation.to),
    );
    const requestRelation = collections.relations.find(
      (relation) =>
        relation.from === pathClass.name && requestBodyNames.has(relation.to),
    );

    const responseRelations = collections.relations.filter((relation) => {
      if (relation.from !== pathClass.name) {
        return false;
      }
      if (!relation.to || disallowedResponseTargets.has(relation.to)) {
        return false;
      }
      return responseCandidates.has(relation.to);
    });

    const operation: OpenApiOperation = {
      operationId: normalizeOperationId(httpInfo.method, pathClass.name),
      summary: buildOperationSummary(pathClass.name, httpInfo.method),
      tags: [deriveOperationTag(pathClass, responseRelations)],
      parameters: buildOperationParameters(
        route,
        parameterRelations,
        collections.classes,
        componentNamesFromCollections(collections),
        collections.enums,
        collections.interfaces,
        context,
      ),
      responses: buildResponsesFromRelations(
        responseRelations,
        httpInfo.method,
        errorSchemaRef,
      ),
      "x-source": {
        kind: "operation",
        name: pathClass.name,
      },
    };

    if (requestRelation) {
      operation.requestBody = buildRequestBodyFromRelation(requestRelation);
    }

    if (!operation.parameters?.length) {
      delete operation.parameters;
    }

    if ((pathItem as any)[methodKey]) {
      pushDiagnostic(context, {
        level: "error",
        code: "duplicate-path-operation",
        message: `Multiple Path stereotypes describe ${httpInfo.method.toUpperCase()} ${route}.`,
        source: {
          stage: "transform",
          entity: pathClass.name,
          path: route,
          method: httpInfo.method.toUpperCase(),
        },
      });
      continue;
    }

    (pathItem as any)[methodKey] = operation;
    paths[route] = pathItem;
  }

  return paths;
}

function hasStereotype(entity: UMLClassLike, stereotype: string): boolean {
  return (
    entity.stereotypes?.some(
      (entry) => entry.toLowerCase() === stereotype.toLowerCase(),
    ) ?? false
  );
}

function isParameterEntity(entity: UMLClassLike): boolean {
  return (
    entity.stereotypes?.some((entry) =>
      entry.toLowerCase().startsWith("parameter"),
    ) ?? false
  );
}

function componentNamesFromCollections(collections: DiagramCollections): Set<string> {
  return collectComponentNames(
    collections.classes.filter((entity) => !hasStereotype(entity, "Path")),
    collections.interfaces,
    collections.enums,
  );
}

function extractHttpDetails(stereotypes?: string[]) {
  if (!stereotypes?.length) {
    return null;
  }

  for (const entry of stereotypes) {
    const match = entry.match(
      /^(get|post|put|delete|patch|options|head)\s+(.+)$/i,
    );
    if (match) {
      return {
        method: match[1].toUpperCase(),
        route: match[2].trim(),
      };
    }
  }

  return null;
}

function normalizeRoute(route: string): string {
  return normalizeRoutePath(route);
}

function buildOperationSummary(name: string, method: string): string {
  const humanized = humanizeName(name);
  return `${method.toUpperCase()} ${humanized}`.trim();
}

function deriveOperationTag(
  pathClass: UMLClassLike,
  responseRelations: UMLRelation[],
): string {
  const responseName = responseRelations
    .map((relation) => relation.to)
    .find(Boolean);
  const baseName = responseName
    ? responseName.replace(/Response$/i, "").trim()
    : pathClass.name;
  return humanizeName(baseName || pathClass.name);
}

function buildRequestBodyFromRelation(
  relation: UMLRelation,
): OpenApiOperation["requestBody"] | undefined {
  if (!relation.to) {
    return undefined;
  }
  const cardinality = analyzeCardinality(relation.toCardinality);
  return {
    required: cardinality.required,
    content: {
      "application/json": {
        schema: refSchema(toComponentRef(relation.to)),
      },
    },
  };
}

function buildOperationParameters(
  route: string,
  parameterRelations: UMLRelation[],
  classes: UMLClassLike[],
  componentNames: Set<string>,
  enums: UMLEnum[],
  interfaces: UMLClassLike[],
  context: TransformContext,
): OpenApiParameter[] {
  const placeholders = extractRoutePlaceholders(route);
  const parameterClassByName = new Map(classes.map((entity) => [entity.name, entity]));
  const explicitParameters: OpenApiParameter[] = [];
  const seen = new Set<string>();

  for (const relation of parameterRelations) {
    const parameterClass = relation.to
      ? parameterClassByName.get(relation.to)
      : undefined;
    if (!parameterClass) {
      continue;
    }

    const definition = buildParameterDefinition(
      parameterClass,
      relation,
      componentNames,
      enums,
      interfaces,
      classes,
      context,
    );
    if (!definition) {
      continue;
    }

    const key = `${definition.in}:${definition.name}`;
    seen.add(key);
    explicitParameters.push(definition);
  }

  for (const placeholder of placeholders) {
    const key = `path:${placeholder}`;
    if (seen.has(key)) {
      continue;
    }

    explicitParameters.push({
      name: placeholder,
      in: "path",
      required: true,
      schema: { type: "string" },
      description: `${humanizeName(placeholder)} path parameter`,
      "x-source": {
        kind: "parameter",
        name: placeholder,
      },
    });
  }

  return explicitParameters.sort(compareParameters);
}

function buildParameterDefinition(
  parameterClass: UMLClassLike,
  relation: UMLRelation,
  componentNames: Set<string>,
  enums: UMLEnum[],
  interfaces: UMLClassLike[],
  classes: UMLClassLike[],
  context: TransformContext,
): OpenApiParameter | undefined {
  const details = extractParameterDetails(parameterClass);
  if (!details) {
    return undefined;
  }

  const valueAttribute =
    parameterClass.attributes.find((attribute) => attribute.name === "value") ??
    parameterClass.attributes[0];
  const schema = applyAttributeAnnotations(
    mapAttributeType(
      valueAttribute?.type,
      componentNames,
      new Set(enums.map((item) => item.name)),
      new Set([...interfaces.map((item) => item.name), ...classes.map((item) => item.name)]),
    ),
    valueAttribute?.annotations,
  );
  const cardinality = analyzeCardinality(relation.toCardinality);

  return {
    name: details.name,
    in: details.in,
    required: details.in === "path" ? true : cardinality.required,
    schema,
    description: valueAttribute?.annotations?.description,
    "x-source": {
      kind: "parameter",
      name: parameterClass.name,
    },
  };
}

function extractParameterDetails(
  entity: UMLClassLike,
): { in: ParameterLocation; name: string } | undefined {
  for (const stereotype of entity.stereotypes ?? []) {
    const match = stereotype.match(
      /^parameter(?:\s+(path|query|header|cookie))?(?:\s+(.+))?$/i,
    );
    if (!match) {
      continue;
    }

    const location = (match[1]?.toLowerCase() ?? "query") as ParameterLocation;
    const rawName = match[2]?.trim();
    const name = rawName ? normalizeParameterName(rawName) : toPropertyName(entity.name);
    if (!name) {
      continue;
    }

    return { in: location, name };
  }

  return undefined;
}

function normalizeParameterName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  return normalizePropertyName(trimmed);
}

function extractRoutePlaceholders(route: string): string[] {
  return Array.from(route.matchAll(/\{([^}]+)\}/g), (match) => match[1]).filter(
    Boolean,
  );
}

function compareParameters(a: OpenApiParameter, b: OpenApiParameter): number {
  if (a.in === b.in) {
    return a.name.localeCompare(b.name);
  }

  if (a.in === "path") {
    return -1;
  }

  if (b.in === "path") {
    return 1;
  }

  return a.in.localeCompare(b.in);
}

function buildResponsesFromRelations(
  relations: UMLRelation[],
  method: string,
  errorSchemaRef: string,
): Record<string, OpenApiResponse> {
  const responses: Record<string, OpenApiResponse> = {};

  if (relations.length === 0) {
    const status = defaultStatusForMethod(method);
    responses[status] = {
      description: `${status} response`,
    };
  } else {
    for (const relation of relations) {
      if (!relation.to) {
        continue;
      }
      const status = extractStatusCode(relation.label, method);
      responses[status] = {
        description: `${status} response`,
        content: {
          "application/json": {
            schema: refSchema(toComponentRef(relation.to)),
          },
        },
      };
    }
  }

  if (!responses["default"]) {
    responses["default"] = buildErrorResponse(
      "Unexpected error",
      errorSchemaRef,
    );
  }
  return responses;
}

function extractStatusCode(label: string | undefined, method: string): string {
  if (label) {
    const cleaned = label.replace(/"/g, "").trim();
    if (cleaned.toLowerCase() === "default") {
      return "default";
    }
    if (/^\d+$/.test(cleaned)) {
      return cleaned;
    }
  }
  return defaultStatusForMethod(method);
}

function defaultStatusForMethod(method: string): string {
  switch (method.toUpperCase()) {
    case "POST":
      return "201";
    case "DELETE":
      return "204";
    default:
      return "200";
  }
}

/**
 * Applies relations to either attach inheritance data or add reference properties.
 */
function applyRelations(
  relations: UMLRelation[],
  classSchemas: Map<string, MutableSchema>,
  inheritanceMap: Map<string, string[]>,
  componentNames: Set<string>,
  context: TransformContext,
) {
  for (const relation of relations) {
    handleRelation(
      relation,
      classSchemas,
      inheritanceMap,
      componentNames,
      context,
    );
  }
}

/**
 * Finalizes all schema drafts and appends enum definitions.
 */
function buildComponentSchemas(
  classSchemas: Map<string, MutableSchema>,
  inheritanceMap: Map<string, string[]>,
  enums: UMLEnum[],
): Record<string, OpenApiSchema> {
  const schemas: Record<string, OpenApiSchema> = {};

  for (const enumType of enums) {
    schemas[enumType.name] = {
      type: "string",
      enum: enumType.values,
      "x-source": {
        kind: "enum",
        name: enumType.name,
      },
    };
  }

  for (const [name, draft] of classSchemas.entries()) {
    const schemaObject: OpenApiObjectSchema = buildSchemaObjectFromDraft(draft);
    const parents = inheritanceMap.get(name);

    if (parents && parents.length > 0) {
      const allOf: OpenApiSchema[] = parents.map((parent) => ({
        $ref: toComponentRef(parent),
      }));
      allOf.push(schemaObject);
      schemas[name] = { allOf };
    } else {
      schemas[name] = schemaObject;
    }
  }

  return schemas;
}

/**
 * Turns the draft structure into a plain OpenAPI object schema.
 */
function buildSchemaObjectFromDraft(
  draft: MutableSchema,
): OpenApiObjectSchema {
  const schemaObject: OpenApiObjectSchema = {
    type: "object",
    properties:
      Object.keys(draft.properties).length > 0 ? draft.properties : undefined,
    required:
      draft.required.size > 0 ? Array.from(draft.required.values()) : undefined,
    description: draft.description,
    "x-source": {
      kind: "class",
      name: draft.name,
    },
  };

  if (draft.methods?.length) {
    schemaObject["x-methods"] = draft.methods.map((method) => ({
      name: method.name,
      access: method.access,
      returnType: method.returnType,
    }));
  }

  return schemaObject;
}

/**
 * Ensures there is a mutable schema draft for the provided name.
 */
function ensureMutableSchema(
  store: Map<string, MutableSchema>,
  name: string,
): MutableSchema {
  if (!store.has(name)) {
    store.set(name, { name, properties: {}, required: new Set<string>() });
  }
  return store.get(name)!;
}

/**
 * Adds UML attributes to the draft schema and marks required properties.
 */
function addAttributesToDraft(
  draft: MutableSchema,
  attributes: UMLAttribute[],
  componentNames: Set<string>,
  enums: UMLDiagram["enums"],
  interfaces: UMLDiagram["interfaces"],
  classes: UMLDiagram["classes"],
  entityName: string,
  context: TransformContext,
) {
  const enumNames = new Set(enums?.map((item) => item.name) ?? []);
  const classLikeNames = new Set([
    ...(interfaces?.map((item) => item.name) ?? []),
    ...(classes?.map((item) => item.name) ?? []),
  ]);

  for (const attribute of attributes) {
    const propertySchema = applyAttributeAnnotations(
      mapAttributeType(
        attribute.type,
        componentNames,
        enumNames,
        classLikeNames,
      ),
      attribute.annotations,
      {
        kind: "attribute",
        name: entityName,
        member: attribute.name,
      },
    );
    draft.properties[attribute.name] = propertySchema;

    for (const unsupportedAnnotation of attribute.unsupportedAnnotations ?? []) {
      pushDiagnostic(context, {
        level: "warning",
        code: "unsupported-annotation",
        message: `Unsupported annotation "${unsupportedAnnotation}" on ${entityName}.${attribute.name}.`,
        source: {
          stage: "parse",
          entity: entityName,
          member: attribute.name,
          annotation: unsupportedAnnotation,
        },
      });
    }

    if (attribute.access === "public" && !attribute.optional) {
      draft.required.add(attribute.name);
    }
  }
}

/**
 * Maps a UML field type to an OpenAPI schema reference or primitive.
 */
function mapAttributeType(
  rawType: string | undefined,
  componentNames: Set<string>,
  enumNames: Set<string>,
  classLikeNames: Set<string>,
): OpenApiSchema {
  if (!rawType) {
    return { type: "string" };
  }

  const trimmed = rawType.trim();
  const normalized = trimmed.toLowerCase();
  const primitive = PRIMITIVE_TYPE_MAP[normalized];

  if (primitive) {
    return { ...primitive };
  }

  const arrayMatch = trimmed.match(/^(.*)\[\]$/);
  if (arrayMatch) {
    const innerType = arrayMatch[1].trim();
    const items = mapAttributeType(
      innerType,
      componentNames,
      enumNames,
      classLikeNames,
    );
    return {
      type: "array",
      items,
    } as OpenApiArraySchema;
  }

  if (trimmed.includes("->")) {
    const [, valuePart] = trimmed.split("->");
    if (valuePart) {
      return {
        type: "object",
        additionalProperties: mapAttributeType(
          valuePart.trim(),
          componentNames,
          enumNames,
          classLikeNames,
        ),
      };
    }
  }

  if (componentNames.has(trimmed)) {
    return { $ref: toComponentRef(trimmed) };
  }

  if (enumNames.has(trimmed)) {
    return { $ref: toComponentRef(trimmed) };
  }

  if (classLikeNames.has(trimmed)) {
    return { $ref: toComponentRef(trimmed) };
  }

  return { type: "string" };
}

function applyAttributeAnnotations(
  schema: OpenApiSchema,
  annotations?: UMLAttributeAnnotations,
  source?: OpenApiSchema["x-source"],
): OpenApiSchema {
  const nextSchema: OpenApiSchema = { ...schema };
  if (source) {
    nextSchema["x-source"] = source;
  }

  if (!annotations) {
    return nextSchema;
  }

  if (annotations.description) {
    nextSchema.description = annotations.description;
  }

  if (annotations.example !== undefined) {
    nextSchema.example = annotations.example;
  }

  if (annotations.nullable) {
    nextSchema.nullable = true;
  }

  if (annotations.pattern && supportsStringValidation(nextSchema)) {
    nextSchema.pattern = annotations.pattern;
  }

  if (annotations.minimum !== undefined && supportsNumericValidation(nextSchema)) {
    nextSchema.minimum = annotations.minimum;
  }

  if (annotations.maximum !== undefined && supportsNumericValidation(nextSchema)) {
    nextSchema.maximum = annotations.maximum;
  }

  if (annotations.default !== undefined) {
    nextSchema.default = annotations.default;
  }

  if (annotations.deprecated) {
    nextSchema.deprecated = true;
  }

  if (annotations.readOnly) {
    nextSchema.readOnly = true;
  }

  if (annotations.writeOnly) {
    nextSchema.writeOnly = true;
  }

  if (annotations.minLength !== undefined && supportsStringValidation(nextSchema)) {
    nextSchema.minLength = annotations.minLength;
  }

  if (annotations.maxLength !== undefined && supportsStringValidation(nextSchema)) {
    nextSchema.maxLength = annotations.maxLength;
  }

  if (annotations.minItems !== undefined && supportsArrayValidation(nextSchema)) {
    nextSchema.minItems = annotations.minItems;
  }

  if (annotations.maxItems !== undefined && supportsArrayValidation(nextSchema)) {
    nextSchema.maxItems = annotations.maxItems;
  }

  return nextSchema;
}

function supportsStringValidation(schema: OpenApiSchema): schema is OpenApiSchema & {
  type: "string";
} {
  return "type" in schema && schema.type === "string";
}

function supportsNumericValidation(schema: OpenApiSchema): schema is OpenApiSchema & {
  type: "number" | "integer";
} {
  return "type" in schema && (schema.type === "number" || schema.type === "integer");
}

function supportsArrayValidation(schema: OpenApiSchema): schema is OpenApiArraySchema {
  return "type" in schema && schema.type === "array";
}

/**
 * Preserves class methods so the resulting schema can expose them via extensions.
 */
function appendMethodsMetadata(draft: MutableSchema, methods: UMLMethod[]) {
  if (!methods.length) {
    return;
  }

  draft.methods = [...(draft.methods ?? []), ...methods];
}

/**
 * Processes a relation to update inheritance records or inject component refs.
 */
function handleRelation(
  relation: UMLRelation,
  classSchemas: Map<string, MutableSchema>,
  inheritanceMap: Map<string, string[]>,
  componentNames: Set<string>,
  context: TransformContext,
) {
  if (!relation.from || !relation.to) {
    return;
  }

  if (relation.type === "inheritance") {
    if (!componentNames.has(relation.from) || !componentNames.has(relation.to)) {
      pushUnresolvedRelationDiagnostic(relation, context);
      return;
    }
    const parents = inheritanceMap.get(relation.to) ?? [];
    parents.push(relation.from);
    inheritanceMap.set(relation.to, parents);
    return;
  }

  if (!["composition", "aggregation", "association"].includes(relation.type)) {
    return;
  }

  if (!componentNames.has(relation.from) || !componentNames.has(relation.to)) {
    pushUnresolvedRelationDiagnostic(relation, context);
    return;
  }

  const draft = ensureMutableSchema(classSchemas, relation.from);
  const propertyName = deriveRelationPropertyName(relation);
  if (!propertyName) {
    return;
  }
  const ref: OpenApiSchema = { $ref: toComponentRef(relation.to) };
  const cardinalityInfo = analyzeCardinality(relation.toCardinality);
  let propertySchema: OpenApiSchema = ref;

  if (cardinalityInfo.isArray) {
    const arraySchema: OpenApiArraySchema = {
      type: "array",
      items: ref,
    };

    if (cardinalityInfo.minItems !== undefined) {
      arraySchema.minItems = cardinalityInfo.minItems;
    }
    if (cardinalityInfo.maxItems !== undefined) {
      arraySchema.maxItems = cardinalityInfo.maxItems;
    }

    propertySchema = arraySchema;
  }

  propertySchema = attachSourceMetadata(propertySchema, {
    kind: "relation",
    name: relation.from,
    member: propertyName,
  });
  draft.properties[propertyName] = propertySchema;

  if (cardinalityInfo.required) {
    draft.required.add(propertyName);
  }
}

/**
 * Converts PlantUML cardinality semantics into array/required hints.
 */
function analyzeCardinality(card?: UMLCardinality) {
  if (!card) {
    return {
      isArray: false,
      required: false,
    };
  }

  switch (card.type) {
    case "exact":
      if (card.value === 1) {
        return { isArray: false, required: true };
      }
      return {
        isArray: true,
        required: card.value > 0,
        minItems: card.value,
        maxItems: card.value,
      };
    case "range": {
      const min = card.min ?? 0;
      const max = card.max;
      if (max === 1) {
        return { isArray: false, required: min > 0 };
      }
      return {
        isArray: true,
        required: min > 0,
        minItems: min > 0 ? min : undefined,
        maxItems: max,
      };
    }
    case "many":
      return { isArray: true, required: false };
    case "custom": {
      const raw = card.raw.toLowerCase();
      if (["one", "single", "singular"].some((token) => raw.includes(token))) {
        return { isArray: false, required: true };
      }
      if (
        ["many", "multiple", "list", "collection"].some((token) =>
          raw.includes(token),
        )
      ) {
        return { isArray: true, required: false };
      }
      return { isArray: false, required: false };
    }
    default:
      return { isArray: false, required: false };
  }
}

/**
 * Produces a camel-cased property name.
 */
function toPropertyName(name: string) {
  if (!name) {
    return name;
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function deriveRelationPropertyName(relation: UMLRelation): string | undefined {
  if (relation.label) {
    const normalized = normalizeRelationLabel(relation.label);
    if (normalized) {
      return normalized;
    }
  }

  return relation.to ? toPropertyName(relation.to) : undefined;
}

function normalizeRelationLabel(label: string): string | undefined {
  const normalized = normalizePropertyName(label);
  if (!normalized) {
    return undefined;
  }

  if (/^\d/.test(normalized)) {
    return `rel${normalized}`;
  }

  return normalized;
}

/**
 * Builds a `$ref` pointing to a schema component.
 */
function toComponentRef(name: string) {
  return `#/components/schemas/${name}`;
}

/**
 * Creates CRUD path stubs for all discovered classes.
 */
function buildCrudPaths(
  classes: UMLClassLike[],
  schemas: Record<string, OpenApiSchema>,
  errorSchemaRef: string,
): Record<string, OpenApiPathItem> {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const umlClass of classes) {
    const resourceName = umlClass.name;
    if (!schemas[resourceName]) {
      continue;
    }

    const pluralResource = toPluralKebabCase(resourceName);
    const collectionPath = `/${pluralResource}`;
    const itemPath = `${collectionPath}/{id}`;
    const tag = resourceName;
    const resourceRef = toComponentRef(resourceName);

    paths[collectionPath] = {
      summary: `${resourceName} collection`,
      get: buildListOperation(tag, resourceRef),
      post: buildCreateOperation(tag, resourceRef, errorSchemaRef),
    };

    paths[itemPath] = {
      summary: `${resourceName} item`,
      get: buildGetOperation(tag, resourceRef, errorSchemaRef),
      put: buildUpdateOperation(tag, resourceRef, errorSchemaRef),
      delete: buildDeleteOperation(tag, errorSchemaRef),
    };
  }

  return paths;
}

/**
 * Produces a listing operation response for a resource.
 */
function buildListOperation(
  tag: string,
  resourceRef: string,
): OpenApiOperation {
  return {
    summary: `List ${tag}s`,
    tags: [tag],
    responses: {
      "200": {
        description: `List of ${tag}s`,
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: refSchema(resourceRef),
            },
          },
        },
      },
    },
  };
}

/**
 * Produces a POST create operation for the resource.
 */
function buildCreateOperation(
  tag: string,
  resourceRef: string,
  errorRef: string,
): OpenApiOperation {
  return {
    summary: `Create ${tag}`,
    tags: [tag],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: refSchema(resourceRef),
        },
      },
    },
    responses: {
      "201": {
        description: `${tag} created`,
        content: {
          "application/json": {
            schema: refSchema(resourceRef),
          },
        },
      },
      "400": buildErrorResponse("Invalid payload", errorRef),
    },
  };
}

/**
 * Produces a GET operation for fetching a single entity.
 */
function buildGetOperation(
  tag: string,
  resourceRef: string,
  errorRef: string,
): OpenApiOperation {
  return {
    summary: `Get ${tag}`,
    tags: [tag],
    parameters: [buildIdParameter(tag)],
    responses: {
      "200": {
        description: `${tag} details`,
        content: {
          "application/json": {
            schema: refSchema(resourceRef),
          },
        },
      },
      "404": buildErrorResponse(`${tag} not found`, errorRef),
    },
  };
}

/**
 * Produces a PUT operation for overriding an entity.
 */
function buildUpdateOperation(
  tag: string,
  resourceRef: string,
  errorRef: string,
): OpenApiOperation {
  return {
    summary: `Update ${tag}`,
    tags: [tag],
    parameters: [buildIdParameter(tag)],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: refSchema(resourceRef),
        },
      },
    },
    responses: {
      "200": {
        description: `${tag} updated`,
        content: {
          "application/json": {
            schema: refSchema(resourceRef),
          },
        },
      },
      "404": buildErrorResponse(`${tag} not found`, errorRef),
    },
  };
}

/**
 * Produces a DELETE operation descriptor.
 */
function buildDeleteOperation(tag: string, errorRef: string): OpenApiOperation {
  return {
    summary: `Delete ${tag}`,
    tags: [tag],
    parameters: [buildIdParameter(tag)],
    responses: {
      "204": {
        description: `${tag} deleted`,
      },
      "404": buildErrorResponse(`${tag} not found`, errorRef),
    },
  };
}

/**
 * Re-usable path parameter descriptor for entity identifiers.
 */
function buildIdParameter(tag: string): OpenApiParameter {
  return {
    name: "id",
    in: "path" as const,
    required: true,
    schema: { type: "string" as const },
    description: `${tag} identifier`,
  };
}

/**
 * Naively pluralizes and kebab-cases a PascalCase class name for REST paths.
 */
function toPluralKebabCase(value: string): string {
  return normalizePathSegment(value);
}

/**
 * Ensures that a shared error payload schema exists and returns its `$ref`.
 */
function ensureErrorSchema(schemas: Record<string, OpenApiSchema>): string {
  if (!schemas[ERROR_SCHEMA_NAME]) {
    schemas[ERROR_SCHEMA_NAME] = {
      type: "object",
      properties: {
        message: { type: "string" },
        code: { type: "string" },
      },
      required: ["message"],
      description: "Standard error payload.",
      "x-source": {
        kind: "class",
        name: ERROR_SCHEMA_NAME,
      },
    };
  }
  return toComponentRef(ERROR_SCHEMA_NAME);
}

/**
 * Helper for describing error responses consistently.
 */
function buildErrorResponse(description: string, errorRef: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: refSchema(errorRef),
      },
    },
  };
}

/**
 * Wraps a component ref with the OpenAPI schema shape.
 */
function refSchema(ref: string): OpenApiSchema {
  return { $ref: ref };
}

function attachSourceMetadata(
  schema: OpenApiSchema,
  source: NonNullable<OpenApiSchema["x-source"]>,
): OpenApiSchema {
  return {
    ...schema,
    "x-source": source,
  };
}

function pushDiagnostic(
  context: TransformContext,
  diagnostic: TransformDiagnostic,
) {
  context.diagnostics.push(diagnostic);
}

function pushUnresolvedRelationDiagnostic(
  relation: UMLRelation,
  context: TransformContext,
) {
  pushDiagnostic(context, {
    level: "warning",
    code: "unresolved-relation-target",
    message: `Relation ${relation.from} -> ${relation.to} could not be resolved to known schemas.`,
    source: {
      stage: "transform",
      relation: `${relation.from}->${relation.to}`,
    },
  });
}

function validateOpenApiDocument(
  document: OpenApiDocument,
  context: TransformContext,
) {
  validateSchemaReferences(document, context);
  validatePathParameters(document, context);
  validateOperations(document, context);
  validateInheritanceCycles(document, context);
}

function validateSchemaReferences(
  document: OpenApiDocument,
  context: TransformContext,
) {
  const schemaNames = new Set(Object.keys(document.components.schemas));

  const visitSchema = (schema: OpenApiSchema | undefined, trail: string) => {
    if (!schema) {
      return;
    }

    if ("$ref" in schema) {
      const name = schema.$ref.replace("#/components/schemas/", "");
      if (!schemaNames.has(name)) {
        pushDiagnostic(context, {
          level: "error",
          code: "missing-schema-ref",
          message: `Reference ${schema.$ref} does not exist.`,
          source: {
            stage: "validate",
            path: trail,
          },
        });
      }
      return;
    }

    if ("items" in schema) {
      visitSchema(schema.items, `${trail}.items`);
    }

    if ("additionalProperties" in schema && schema.additionalProperties) {
      visitSchema(schema.additionalProperties, `${trail}.additionalProperties`);
    }

    if ("properties" in schema && schema.properties) {
      for (const [name, property] of Object.entries(schema.properties)) {
        visitSchema(property, `${trail}.properties.${name}`);
      }
    }

    if ("allOf" in schema) {
      schema.allOf.forEach((item, index) => {
        visitSchema(item, `${trail}.allOf.${index}`);
      });
    }
  };

  for (const [name, schema] of Object.entries(document.components.schemas)) {
    visitSchema(schema, `components.schemas.${name}`);
  }

  for (const [route, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isOperationKey(method) || !operation) {
        continue;
      }

      operation.parameters?.forEach((parameter, index) => {
        visitSchema(parameter.schema, `paths.${route}.${method}.parameters.${index}`);
      });

      for (const [status, response] of Object.entries(operation.responses)) {
        const content = response.content?.["application/json"]?.schema;
        visitSchema(content, `paths.${route}.${method}.responses.${status}`);
      }

      visitSchema(
        operation.requestBody?.content?.["application/json"]?.schema,
        `paths.${route}.${method}.requestBody`,
      );
    }
  }
}

function validatePathParameters(
  document: OpenApiDocument,
  context: TransformContext,
) {
  for (const [route, pathItem] of Object.entries(document.paths)) {
    const placeholders = extractRoutePlaceholders(route);

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isOperationKey(method) || !operation) {
        continue;
      }

      const pathParameters = new Set(
        (operation.parameters ?? [])
          .filter((parameter) => parameter.in === "path")
          .map((parameter) => parameter.name),
      );

      for (const placeholder of placeholders) {
        if (!pathParameters.has(placeholder)) {
          pushDiagnostic(context, {
            level: "error",
            code: "missing-path-parameter",
            message: `Route placeholder {${placeholder}} is missing a path parameter in ${method.toUpperCase()} ${route}.`,
            source: {
              stage: "validate",
              path: route,
              method: method.toUpperCase(),
            },
          });
        }
      }
    }
  }
}

function validateOperations(
  document: OpenApiDocument,
  context: TransformContext,
) {
  for (const [route, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isOperationKey(method) || !operation) {
        continue;
      }

      if (Object.keys(operation.responses).length === 0) {
        pushDiagnostic(context, {
          level: "error",
          code: "empty-responses",
          message: `Operation ${method.toUpperCase()} ${route} has no responses.`,
          source: {
            stage: "validate",
            path: route,
            method: method.toUpperCase(),
          },
        });
      }

      if (
        operation.requestBody &&
        Object.keys(operation.requestBody.content ?? {}).length === 0
      ) {
        pushDiagnostic(context, {
          level: "error",
          code: "empty-request-body",
          message: `Operation ${method.toUpperCase()} ${route} has an empty requestBody.`,
          source: {
            stage: "validate",
            path: route,
            method: method.toUpperCase(),
          },
        });
      }
    }
  }
}

function validateInheritanceCycles(
  document: OpenApiDocument,
  context: TransformContext,
) {
  const graph = new Map<string, string[]>();

  for (const [name, schema] of Object.entries(document.components.schemas)) {
    if (!("allOf" in schema)) {
      continue;
    }

    const parents = schema.allOf
      .filter((item): item is Extract<OpenApiSchema, { $ref: string }> => "$ref" in item)
      .map((item) => item.$ref.replace("#/components/schemas/", ""));
    graph.set(name, parents);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (name: string) => {
    if (visiting.has(name)) {
      pushDiagnostic(context, {
        level: "error",
        code: "inheritance-cycle",
        message: `Inheritance cycle detected at schema ${name}.`,
        source: {
          stage: "validate",
          entity: name,
        },
      });
      return;
    }

    if (visited.has(name)) {
      return;
    }

    visiting.add(name);
    for (const parent of graph.get(name) ?? []) {
      dfs(parent);
    }
    visiting.delete(name);
    visited.add(name);
  };

  for (const name of graph.keys()) {
    dfs(name);
  }
}

function canonicalizeDocument(document: OpenApiDocument): OpenApiDocument {
  const sortRecord = <T>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
    ) as Record<string, T>;

  const canonicalizeSchema = (schema: OpenApiSchema): OpenApiSchema => {
    if ("$ref" in schema) {
      return schema;
    }

    if ("items" in schema) {
      return {
        ...schema,
        items: canonicalizeSchema(schema.items),
      };
    }

    if ("allOf" in schema) {
      return {
        ...schema,
        allOf: schema.allOf.map(canonicalizeSchema),
      };
    }

    if ("properties" in schema && schema.properties) {
      return {
        ...schema,
        properties: sortRecord(
          Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [
              key,
              canonicalizeSchema(value),
            ]),
          ),
        ),
        required: schema.required?.slice().sort((a, b) => a.localeCompare(b)),
      };
    }

    return schema;
  };

  const paths = sortRecord(
    Object.fromEntries(
      Object.entries(document.paths).map(([route, pathItem]) => [
        route,
        canonicalizePathItem(pathItem),
      ]),
    ),
  );
  const schemas = sortRecord(
    Object.fromEntries(
      Object.entries(document.components.schemas).map(([name, schema]) => [
        name,
        canonicalizeSchema(schema),
      ]),
    ),
  );

  return {
    ...document,
    paths,
    components: {
      ...document.components,
      schemas,
    },
  };
}

function canonicalizePathItem(pathItem: OpenApiPathItem): OpenApiPathItem {
  const methodOrder = ["delete", "get", "head", "options", "patch", "post", "put"];
  const next: OpenApiPathItem = {};

  if (pathItem.summary) {
    next.summary = pathItem.summary;
  }

  if (pathItem.description) {
    next.description = pathItem.description;
  }

  for (const method of methodOrder) {
    const operation = (pathItem as Record<string, OpenApiOperation | string | undefined>)[method];
    if (operation && typeof operation === "object") {
      (next as Record<string, OpenApiOperation>)[method] = {
        ...operation,
        parameters: operation.parameters?.slice().sort(compareParameters),
        responses: Object.fromEntries(
          Object.entries(operation.responses).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      };
    }
  }

  return next;
}

function canonicalizeDiagnostics(
  diagnostics: TransformDiagnostic[],
): TransformDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const leftKey = `${left.level}:${left.code}:${left.message}`;
    const rightKey = `${right.level}:${right.code}:${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function isOperationKey(value: string): value is keyof OpenApiPathItem {
  return ["get", "post", "put", "delete", "patch", "head", "options"].includes(
    value,
  );
}
