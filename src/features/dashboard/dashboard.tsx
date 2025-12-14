"use client";

import plantumlEncoder from "plantuml-encoder";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import YAML from "yaml";
import { CodeEditor } from "../editor/code-editor";
import { DEFAULT_PLANTUML } from "../editor/utils";
import type { OpenApiDocument } from "../transformator/open-api/open-api-types";
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

  const handleOpenAPiChange = (event: string) => {};

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

  const openApiSchemas = useMemo(() => {
    if (!openApiDiagram) {
      return [];
    }

    return Object.entries(openApiDiagram.components?.schemas ?? {});
  }, [openApiDiagram]);

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
                  onChange={handleOpenAPiChange}
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
      </div>
    </div>
  );
}
