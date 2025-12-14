"use client";

import plantumlEncoder from "plantuml-encoder";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import YAML from "yaml";
import { CodeEditor } from "../editor/code-editor";
import { DEFAULT_PLANTUML } from "../editor/utils";
import type {
  OpenApiAllOfSchema,
  OpenApiArraySchema,
  OpenApiDocument,
  OpenApiObjectSchema,
  OpenApiPrimitiveSchema,
  OpenApiReferenceSchema,
  OpenApiSchema,
} from "../transformator/open-api/open-api-types";
import { useTransformator } from "../transformator/use-transformator";

type PlantUmlFixture = {
  id: string;
  fileName: string;
  label: string;
  content: string;
};

export default function Dashboard() {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML);
  const [openApiSchema, setOpenApiSchema] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [diagramSize, setDiagramSize] = useState({ width: 0, height: 0 });
  const [openApiDiagram, setOpenApiDiagram] = useState<OpenApiDocument | null>(
    null
  );
  const [fixtures, setFixtures] = useState<PlantUmlFixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const { transform } = useTransformator();

  const updateOutputs = useCallback(
    (uml: string) => {
      const diagram = transform(uml);
      setDiagramUrl(
        `https://www.plantuml.com/plantuml/png/${plantumlEncoder.encode(uml)}`
      );
      setOpenApiSchema(YAML.stringify(diagram));
      setOpenApiDiagram(diagram);
    },
    [transform]
  );

  useEffect(() => {
    updateOutputs(DEFAULT_PLANTUML);
  }, [updateOutputs]);

  useEffect(() => {
    if (!diagramUrl) {
      return;
    }

    let isCancelled = false;
    const image = new Image();
    image.src = diagramUrl;
    image.onload = () => {
      if (isCancelled) return;
      setDiagramSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      if (isCancelled) return;
      setDiagramSize({ width: 0, height: 0 });
    };

    return () => {
      isCancelled = true;
    };
  }, [diagramUrl]);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        setFixturesLoading(true);
        const response = await fetch("/api/plant-uml-fixtures");
        if (!response.ok) {
          throw new Error("Failed to load fixtures");
        }
        const data = (await response.json()) as PlantUmlFixture[];
        setFixtures(data);
        setFixturesError(null);
      } catch (error) {
        console.error(error);
        setFixturesError("Nepavyko įkelti pavyzdinių PlantUML failų.");
      } finally {
        setFixturesLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  const handleUmlChange = (event: string) => {
    setPlantUmlCode(event);
    setSelectedFixtureId("");
    updateOutputs(event);
  };

  const handleFixtureChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSelectedFixtureId(value);
    if (!value) {
      return;
    }

    const selected = fixtures.find((fixture) => fixture.id === value);
    if (!selected) {
      return;
    }

    setPlantUmlCode(selected.content);
    updateOutputs(selected.content);
  };

  const mermaidDefinition = useMemo(
    () => buildMermaidDiagram(openApiDiagram),
    [openApiDiagram]
  );

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="border-b bg-white px-6 py-3 shadow-sm border-gray-200 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            PlantUML to OpenAPI Converter
          </h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top section with editors */}
        <div className="flex flex-1 flex-col md:flex-row">
          {/* Left: PlantUML input */}
          <div className="flex h-1/2 w-full flex-col border-r border-gray-200 dark:border-gray-700 md:h-full md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">
                PlantUML Input
              </h2>
              <div className="flex flex-col items-end gap-1">
                <select
                  id="fixture-select"
                  value={selectedFixtureId}
                  onChange={handleFixtureChange}
                  disabled={fixturesLoading}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">
                    {fixturesLoading ? "Loading..." : "Select test case"}
                  </option>
                  {fixtures.map((fixture) => (
                    <option key={fixture.id} value={fixture.id}>
                      {fixture.label}
                    </option>
                  ))}
                </select>
                {fixturesError && (
                  <p className="text-xs text-red-500">{fixturesError}</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={plantUmlCode}
                onChange={handleUmlChange}
                language="plantuml"
                height="100%"
              />
            </div>
          </div>

          <div className="flex h-1/2 w-full flex-col border-t border-gray-200 dark:border-gray-700 md:h-full md:w-1/2 md:border-t-0">
            <div className="flex flex-1 flex-col border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="font-medium text-gray-700 dark:text-gray-200">
                  OpenAPI Schema
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={openApiSchema}
                  onChange={() => {}}
                  language="yaml"
                  height="100%"
                  readOnly={true}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="grid grid-cols-2">
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex flex-col">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  PlantUML Diagram
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                <img
                  src={diagramUrl === "" ? "./placeholder.svg" : diagramUrl}
                  alt="PlantUML Diagram"
                  width={diagramSize.width || undefined}
                  height={diagramSize.height || undefined}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex flex-col">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  OpenAPI Diagram
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                Diagram
                {/* <MermaidDiagram definition={mermaidDefinition} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MermaidDiagram({ definition }: { definition: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      if (!definition.trim()) {
        setSvg("");
        setError("Nėra duomenų vizualizacijai.");
        return;
      }

      try {
        const mermaid = await import("mermaid");
        const mermaidAPI = mermaid.default;

        mermaidAPI.initialize({ startOnLoad: false, theme: "forest" });
        const renderId = `openapi-mermaid-${Math.random()
          .toString(36)
          .slice(2)}`;

        const { svg } = await mermaidAPI.render(renderId, definition);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (err) {
        console.error("Mermaid render failed", err);
        if (!cancelled) {
          setError("Nepavyko sugeneruoti Mermaid diagramos.");
          setSvg("");
        }
      }
    }

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [definition]);

  if (error) {
    return (
      <p className="text-sm text-red-500" role="alert">
        {error}
      </p>
    );
  }

  if (!svg) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Generuojama Mermaid diagrama...
      </p>
    );
  }

  return (
    <div
      className="w-full min-h-[200px]"
      aria-label="OpenAPI Mermaid diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function buildMermaidDiagram(document: OpenApiDocument | null): string {
  const schemas = document?.components?.schemas;
  if (!schemas || Object.keys(schemas).length === 0) {
    return "";
  }

  const lines: string[] = ["classDiagram"];
  const relations: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    lines.push(...buildClassBlock(name, schema));
    relations.push(...collectRelations(name, schema));
  }

  return [...lines, ...relations].join("\n");
}

function buildClassBlock(name: string, schema: OpenApiSchema): string[] {
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

function collectRelations(parent: string, schema: OpenApiSchema): string[] {
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
        relations.push(`${parent} --|> ${target}`);
      }
    }
  }

  return relations;
}

function describeSchema(schema: OpenApiSchema): string {
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

function resolveReferenceTarget(schema: OpenApiSchema): string | undefined {
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

function extractRefName(ref: string): string {
  const segments = ref.split("/");
  return segments[segments.length - 1] || ref;
}

function isReferenceSchema(
  schema: OpenApiSchema
): schema is OpenApiReferenceSchema {
  return Boolean((schema as OpenApiReferenceSchema).$ref);
}

function isArraySchema(schema: OpenApiSchema): schema is OpenApiArraySchema {
  return (schema as OpenApiArraySchema).type === "array";
}

function isObjectSchema(schema: OpenApiSchema): schema is OpenApiObjectSchema {
  return (schema as OpenApiObjectSchema).type === "object";
}

function isPrimitiveSchema(
  schema: OpenApiSchema
): schema is OpenApiPrimitiveSchema {
  return (
    "type" in schema &&
    typeof schema.type === "string" &&
    schema.type !== "array" &&
    schema.type !== "object"
  );
}

function isAllOfSchema(schema: OpenApiSchema): schema is OpenApiAllOfSchema {
  return Array.isArray((schema as OpenApiAllOfSchema).allOf);
}
