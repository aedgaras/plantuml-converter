import {
  UMLAttribute,
  UMLCardinality,
  UMLDiagram,
  UMLMethod,
  UMLRelation,
} from "../plant-uml/plant-uml-types";
import {
  OpenApiArraySchema,
  OpenApiDocument,
  OpenApiObjectSchema,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiSchema,
} from "./open-api-types";

type MutableSchema = {
  properties: Record<string, OpenApiSchema>;
  required: Set<string>;
  description?: string;
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
};

const ERROR_SCHEMA_NAME = "ApiError";

export function transformToOpenApi(
  plantUMLDiagram: UMLDiagram
): OpenApiDocument {
  const classSchemas = new Map<string, MutableSchema>();
  const inheritanceMap = new Map<string, string[]>();
  const schemas: Record<string, OpenApiSchema> = {};

  const classes = plantUMLDiagram.classes ?? [];
  const interfaces = plantUMLDiagram.interfaces ?? [];
  const enums = plantUMLDiagram.enums ?? [];
  const relations = plantUMLDiagram.relations ?? [];

  const componentNames = new Set<string>();
  for (const entity of [...classes, ...interfaces, ...enums]) {
    componentNames.add(entity.name);
  }

  for (const entity of [...classes, ...interfaces]) {
    const draft = ensureMutableSchema(classSchemas, entity.name);
    addAttributesToDraft(
      draft,
      entity.attributes,
      componentNames,
      enums,
      interfaces,
      classes
    );
    appendMethodsDescription(draft, entity.methods);
  }

  for (const relation of relations) {
    handleRelation(relation, classSchemas, inheritanceMap, componentNames);
  }

  for (const enumType of enums) {
    schemas[enumType.name] = {
      type: "string",
      enum: enumType.values,
    };
  }

  for (const [name, draft] of classSchemas.entries()) {
    const schemaObject: OpenApiObjectSchema = {
      type: "object",
      properties:
        Object.keys(draft.properties).length > 0 ? draft.properties : undefined,
      required:
        draft.required.size > 0
          ? Array.from(draft.required.values())
          : undefined,
      description: draft.description,
    };

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

  const errorRef = ensureErrorSchema(schemas);
  const paths = buildCrudPaths(classes, schemas, errorRef);

  return {
    openapi: "3.1.0",
    info: {
      title: "PlantUML Generated API",
      version: "1.0.0",
      description: "OpenAPI schema generated from PlantUML diagram.",
    },
    paths,
    components: {
      schemas,
    },
  };
}

function ensureMutableSchema(
  store: Map<string, MutableSchema>,
  name: string
): MutableSchema {
  if (!store.has(name)) {
    store.set(name, { properties: {}, required: new Set<string>() });
  }
  return store.get(name)!;
}

function addAttributesToDraft(
  draft: MutableSchema,
  attributes: UMLAttribute[],
  componentNames: Set<string>,
  enums: UMLDiagram["enums"],
  interfaces: UMLDiagram["interfaces"],
  classes: UMLDiagram["classes"]
) {
  const enumNames = new Set(enums?.map((item) => item.name) ?? []);
  const classLikeNames = new Set([
    ...(interfaces?.map((item) => item.name) ?? []),
    ...(classes?.map((item) => item.name) ?? []),
  ]);

  for (const attribute of attributes) {
    const propertySchema = mapAttributeType(
      attribute.type,
      componentNames,
      enumNames,
      classLikeNames
    );
    draft.properties[attribute.name] = propertySchema;

    if (attribute.access === "public") {
      draft.required.add(attribute.name);
    }
  }
}

function mapAttributeType(
  rawType: string | undefined,
  componentNames: Set<string>,
  enumNames: Set<string>,
  classLikeNames: Set<string>
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

function appendMethodsDescription(draft: MutableSchema, methods: UMLMethod[]) {
  if (!methods.length) {
    return;
  }

  const summary = methods
    .map((method) => {
      const returnSuffix = method.returnType ? `: ${method.returnType}` : "";
      return `${method.access} ${method.name}()${returnSuffix}`;
    })
    .join(", ");

  if (!summary) {
    return;
  }

  draft.description = draft.description
    ? `${draft.description}\nMetodai: ${summary}`
    : `Metodai: ${summary}`;
}

function handleRelation(
  relation: UMLRelation,
  classSchemas: Map<string, MutableSchema>,
  inheritanceMap: Map<string, string[]>,
  componentNames: Set<string>
) {
  if (!relation.from || !relation.to) {
    return;
  }

  if (relation.type === "inheritance") {
    const parents = inheritanceMap.get(relation.to) ?? [];
    parents.push(relation.from);
    inheritanceMap.set(relation.to, parents);
    return;
  }

  if (!["composition", "aggregation", "association"].includes(relation.type)) {
    return;
  }

  if (!componentNames.has(relation.from) || !componentNames.has(relation.to)) {
    return;
  }

  const draft = ensureMutableSchema(classSchemas, relation.from);
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

  const propertyName = toPropertyName(relation.to);
  draft.properties[propertyName] = propertySchema;

  if (cardinalityInfo.required) {
    draft.required.add(propertyName);
  }
}

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
          raw.includes(token)
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

function toPropertyName(name: string) {
  if (!name) {
    return name;
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function toComponentRef(name: string) {
  return `#/components/schemas/${name}`;
}

function buildCrudPaths(
  classes: UMLDiagram["classes"],
  schemas: Record<string, OpenApiSchema>,
  errorSchemaRef: string
): Record<string, OpenApiPathItem> {
  const paths: Record<string, OpenApiPathItem> = {};
  if (!classes) {
    return paths;
  }

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

function buildListOperation(
  tag: string,
  resourceRef: string
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

function buildCreateOperation(
  tag: string,
  resourceRef: string,
  errorRef: string
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

function buildGetOperation(
  tag: string,
  resourceRef: string,
  errorRef: string
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

function buildUpdateOperation(
  tag: string,
  resourceRef: string,
  errorRef: string
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

function buildIdParameter(tag: string): OpenApiParameter {
  return {
    name: "id",
    in: "path" as const,
    required: true,
    schema: { type: "string" as const },
    description: `${tag} identifier`,
  };
}

function toPluralKebabCase(value: string): string {
  const kebab = value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

  if (kebab.endsWith("s")) {
    return kebab;
  }

  if (/(x|z|ch|sh)$/.test(kebab)) {
    return `${kebab}es`;
  }

  if (kebab.endsWith("y") && !/[aeiou]y$/.test(kebab)) {
    return kebab.slice(0, -1) + "ies";
  }

  return `${kebab}s`;
}

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
    };
  }
  return toComponentRef(ERROR_SCHEMA_NAME);
}

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

function refSchema(ref: string): OpenApiSchema {
  return { $ref: ref };
}
