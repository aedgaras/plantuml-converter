import {
  OpenApiDocument,
  OpenApiSchema,
  OpenApiReferenceSchema,
  OpenApiArraySchema,
  OpenApiObjectSchema,
  OpenApiPrimitiveSchema,
  OpenApiAllOfSchema,
} from "../transformator/open-api/open-api-types";

export function buildOpenApiPlantUmlDiagram(
  document: OpenApiDocument | null,
): string {
  const schemas = document?.components?.schemas;
  if (!schemas || Object.keys(schemas).length === 0) {
    return "";
  }

  const lines: string[] = ["@startuml", "skinparam classAttributeIconSize 0"];
  const relations: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    lines.push(...buildPlantUmlClassBlock(name, schema));
    relations.push(...collectPlantUmlRelations(name, schema));
  }

  lines.push(...relations, "@enduml");
  return lines.join("\n");
}

export function buildPlantUmlClassBlock(
  name: string,
  schema: OpenApiSchema,
): string[] {
  if (isObjectSchema(schema) && schema.properties) {
    const block: string[] = [`class ${name} {`];
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      block.push(`  ${propName}: ${describeSchema(propSchema)}`);
    }
    block.push("}");
    return block;
  }

  if (isPrimitiveSchema(schema)) {
    return [
      `class ${name} {`,
      `  ${schema.type}${schema.format ? ` (${schema.format})` : ""}`,
      "}",
    ];
  }

  if (isArraySchema(schema)) {
    return [`class ${name} {`, `  Array<${describeSchema(schema.items)}>`, "}"];
  }

  if (isReferenceSchema(schema)) {
    return [`class ${name} {`, `  ref ${extractRefName(schema.$ref)}`, "}"];
  }

  return [`class ${name}`];
}

export function collectPlantUmlRelations(
  parent: string,
  schema: OpenApiSchema,
): string[] {
  const relations: string[] = [];

  if (isObjectSchema(schema) && schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const target = resolveReferenceTarget(propSchema);
      if (target) {
        relations.push(`${parent} --> ${target} : ${propName}`);
      }
    }
  }

  if (isArraySchema(schema)) {
    const target = resolveReferenceTarget(schema.items);
    if (target) {
      relations.push(`${parent} --> ${target} : items`);
    }
  }

  if (isAllOfSchema(schema)) {
    for (const item of schema.allOf) {
      const target = resolveReferenceTarget(item);
      if (target) {
        relations.push(`${target} <|-- ${parent}`);
      }
    }
  }

  return relations;
}

export function describeSchema(schema: OpenApiSchema): string {
  if (isReferenceSchema(schema)) {
    return extractRefName(schema.$ref);
  }
  if (isPrimitiveSchema(schema)) {
    return schema.format ? `${schema.type} (${schema.format})` : schema.type;
  }
  if (isArraySchema(schema)) {
    return `List<${describeSchema(schema.items)}>`;
  }
  if (isObjectSchema(schema)) {
    const propertyCount = schema.properties
      ? Object.keys(schema.properties).length
      : 0;
    return `Object(${propertyCount})`;
  }
  if (isAllOfSchema(schema)) {
    return schema.allOf.map(describeSchema).join(" & ");
  }
  return "Schema";
}

export function resolveReferenceTarget(
  schema: OpenApiSchema,
): string | undefined {
  if (isReferenceSchema(schema)) {
    return extractRefName(schema.$ref);
  }
  if (isArraySchema(schema)) {
    return resolveReferenceTarget(schema.items);
  }
  if (isAllOfSchema(schema)) {
    for (const item of schema.allOf) {
      const ref = resolveReferenceTarget(item);
      if (ref) {
        return ref;
      }
    }
  }
  return undefined;
}

export function extractRefName(ref: string): string {
  const segments = ref.split("/");
  return segments[segments.length - 1] || ref;
}

export function isReferenceSchema(
  schema: OpenApiSchema,
): schema is OpenApiReferenceSchema {
  return Boolean((schema as OpenApiReferenceSchema).$ref);
}

export function isArraySchema(
  schema: OpenApiSchema,
): schema is OpenApiArraySchema {
  return (schema as OpenApiArraySchema).type === "array";
}

export function isObjectSchema(
  schema: OpenApiSchema,
): schema is OpenApiObjectSchema {
  return (schema as OpenApiObjectSchema).type === "object";
}

export function isPrimitiveSchema(
  schema: OpenApiSchema,
): schema is OpenApiPrimitiveSchema {
  return (
    "type" in schema &&
    typeof schema.type === "string" &&
    schema.type !== "array" &&
    schema.type !== "object"
  );
}

export function isAllOfSchema(
  schema: OpenApiSchema,
): schema is OpenApiAllOfSchema {
  return Array.isArray((schema as OpenApiAllOfSchema).allOf);
}
