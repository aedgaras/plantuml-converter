"use client";

import { debounce } from "@/src/lib/utils";
import plantumlEncoder from "plantuml-encoder";
import { useCallback, useEffect, useState } from "react";
import { CodeEditor } from "../editor/code-editor";
import { DEFAULT_PLANTUML } from "../editor/utils";
import { useTransform } from "../transformator/use-transform";

export default function Dashboard() {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML);
  const [openApiSchema, setOpenApiSchema] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const { transform } = useTransform();

  useEffect(() => {
    generateDiagram();
    setOpenApiSchema(transform(plantUmlCode));
  }, []);

  const generateDiagram = useCallback(() => {
    const diagram = transform(plantUmlCode);
    setDiagramUrl(
      `https://www.plantuml.com/plantuml/png/${plantumlEncoder.encode(
        plantUmlCode
      )}`
    );
    debounce(() => setOpenApiSchema(diagram), 1);
  }, []);

  const handleUmlChange = (event: string) => {
    setPlantUmlCode(event);
    const diagram = transform(plantUmlCode);
    setDiagramUrl(
      `https://www.plantuml.com/plantuml/png/${plantumlEncoder.encode(event)}`
    );
    console.log(diagramUrl);
    setOpenApiSchema(diagram);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white px-6 py-3 shadow-sm border-gray-200 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            PlantUML to OpenAPI Converter
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top section with editors */}
        <div className="flex flex-1 flex-col md:flex-row">
          {/* Left: PlantUML input */}
          <div className="flex h-1/2 w-full flex-col border-r border-gray-200 dark:border-gray-700 md:h-full md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">
                PlantUML Input
              </h2>
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

          {/* Right: OpenAPI schema */}
          <div className="flex h-1/2 w-full flex-col md:h-full md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">
                OpenAPI Schema
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={openApiSchema}
                onChange={() => {}}
                language="json"
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Bottom: Diagram */}
        <div
          className="border-t border-gray-200 dark:border-gray-700"
          style={{ height: "auto" }}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">
                Diagram Preview
              </h2>
            </div>
          </div>
          <img
            src={diagramUrl === "" ? "./placeholder.svg" : diagramUrl}
            alt="PlantUML Diagram"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </main>
    </div>
  );
}
