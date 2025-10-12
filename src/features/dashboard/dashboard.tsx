"use client";

import { debounce } from "@/src/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { CodeEditor } from "../editor/code-editor";
import { DEFAULT_PLANTUML } from "../editor/utils";
import { useTransform } from "../transformator/use-transform";

export default function Dashboard() {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML);
  const [openApiSchema, setOpenApiSchema] = useState("");
  const [mounted, setMounted] = useState(false);
  const { transform } = useTransform();

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateDiagram = useCallback(() => {
    const diagram = transform(plantUmlCode);
    debounce(() => setOpenApiSchema(diagram), 1);
  }, []);

  useEffect(() => {
    if (mounted) {
      generateDiagram();
    }
  }, [mounted, generateDiagram]);

  const handleUmlChange = (event: string) => {

    setPlantUmlCode(event);
    const diagram = transform(plantUmlCode);
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
                onChange={(value) => handleUmlChange(value)}
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
        {/* <div
          className="border-t border-gray-200 dark:border-gray-700"
          style={{ height: isDiagramCollapsed ? "auto" : "300px" }}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isDiagramCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <h2 className="font-medium text-gray-700 dark:text-gray-200">
                Diagram Preview
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-transparent"
              onClick={downloadDiagram}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Download</span>
            </Button>
          </div>
          {!isDiagramCollapsed && (
            <div className="flex h-[calc(300px-43px)] items-center justify-center overflow-auto p-4 bg-white dark:bg-gray-800">
              {isGenerating ? (
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <img
                  src={diagramUrl || "/placeholder.svg"}
                  alt="PlantUML Diagram"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
          )}
        </div> */}
      </main>

      {/* <SettingsDrawer
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      /> */}
    </div>
  );
}
