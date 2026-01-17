"use client";

import { CodeEditor } from "../editor/code-editor";
import { useDashboard } from "./useDashboard";

export default function Dashboard() {
  const {
    diagramUrl,
    diagramSize,
    openApiSchema,
    selectedFixtureId,
    handleFixtureChange,
    fixturesLoading,
    handleUmlChange,
    fixturesByCategory,
    fixturesError,
    plantUmlCode,
  } = useDashboard();

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
                    {fixturesLoading ? "Loading..." : "Select PlantUML fixture"}
                  </option>
                  {fixturesByCategory.map(({ category, fixtures }) => (
                    <optgroup key={category} label={category}>
                      {fixtures.map((fixture) => (
                        <option key={fixture.id} value={fixture.id}>
                          {fixture.label}
                        </option>
                      ))}
                    </optgroup>
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

      <div className="grid grid-cols-1">
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
      </div>
    </div>
  );
}
