"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Settings, Copy, Download, RefreshCw, Upload, FileDown, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { SettingsDrawer } from "@/src/components/settings-drawer"
import { useToast } from "@/src/hooks/use-toast"
import { CodeEditor } from "@/src/components/code-editor"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu"

const DEFAULT_PLANTUML = `@startuml
class Pet {
  +name: string
  +age: integer
  +species: string
}

class Owner {
  +name: string
  +email: string
  +phone: string
}

Pet "*" -- "1" Owner : belongs to
@enduml`

const DEFAULT_OPENAPI = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet API",
    "version": "1.0.0",
    "description": "API for managing pets and owners"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "Get all pets",
        "responses": {
          "200": {
            "description": "List of pets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Pet"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "age": { "type": "integer" },
          "species": { "type": "string" },
          "ownerId": { "type": "string" }
        }
      },
      "Owner": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" },
          "phone": { "type": "string" }
        }
      }
    }
  }
}`

export default function Home() {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML)
  const [openApiSchema, setOpenApiSchema] = useState(DEFAULT_OPENAPI)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [diagramUrl, setDiagramUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("json")
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const generateDiagram = useCallback(() => {
    setIsGenerating(true)
    // Simulate diagram generation
    setTimeout(() => {
      setDiagramUrl("/placeholder.svg?height=400&width=800&text=PlantUML+Diagram")
      setIsGenerating(false)
    }, 500)
  }, [])

  useEffect(() => {
    if (mounted) {
      generateDiagram()
    }
  }, [mounted, generateDiagram])

  const handleCopySchema = () => {
    navigator.clipboard.writeText(openApiSchema)
    toast({
      title: "Copied to clipboard",
      description: "OpenAPI schema has been copied to clipboard.",
    })
  }

  const handleImportPlantUml = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        setPlantUmlCode(content)
        generateDiagram()
        toast({
          title: "File imported",
          description: `Imported PlantUML from ${file.name}`,
        })
      }
    }
    reader.readAsText(file)
    if (event.target) event.target.value = ""
  }

  const exportOpenApi = (format: "json" | "yaml") => {
    const fileName = format === "json" ? "openapi.json" : "openapi.yaml"
    const blob = new Blob([openApiSchema], {
      type: format === "json" ? "application/json" : "text/yaml",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "File exported",
      description: `OpenAPI schema exported as ${fileName}`,
    })
  }

  const downloadDiagram = () => {
    toast({
      title: "Diagram downloaded",
      description: "Diagram downloaded successfully",
    })
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <input type="file" ref={fileInputRef} className="hidden" accept=".puml,.txt" onChange={handleImportPlantUml} />

      {/* Header */}
      <header className="border-b bg-white px-6 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">PlantUML to OpenAPI Converter</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex bg-transparent"
              onClick={() => {
                toast({
                  title: "Documentation",
                  description: "Documentation would open here.",
                })
              }}
            >
              Documentation
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-9 rounded-full"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top section with editors */}
        <div className="flex flex-1 flex-col md:flex-row">
          {/* Left: PlantUML input */}
          <div className="flex h-1/2 w-full flex-col border-r border-gray-200 dark:border-gray-700 md:h-full md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">PlantUML Input</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
                <Button size="sm" variant="default" className="h-8" onClick={generateDiagram}>
                  <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline ml-1">Generate</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor value={plantUmlCode} onChange={setPlantUmlCode} language="plaintext" height="100%" />
            </div>
          </div>

          {/* Right: OpenAPI schema */}
          <div className="flex h-1/2 w-full flex-col md:h-full md:w-1/2">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="font-medium text-gray-700 dark:text-gray-200">OpenAPI Schema</h2>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 bg-transparent">
                      <FileDown className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportOpenApi("json")}>Export as JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportOpenApi("yaml")}>Export as YAML</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={handleCopySchema}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Copy</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <div className="border-b border-gray-200 px-4 dark:border-gray-700">
                  <TabsList className="h-10 bg-transparent">
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="yaml">YAML</TabsTrigger>
                  </TabsList>
                </div>
                <div className="h-[calc(100%-43px)]">
                  <TabsContent value="json" className="h-full m-0">
                    <CodeEditor value={openApiSchema} onChange={setOpenApiSchema} language="json" height="100%" />
                  </TabsContent>
                  <TabsContent value="yaml" className="h-full m-0">
                    <CodeEditor value="# YAML view" onChange={() => {}} language="yaml" height="100%" />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Bottom: Diagram */}
        <div
          className="border-t border-gray-200 dark:border-gray-700"
          style={{ height: isDiagramCollapsed ? "auto" : "300px" }}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isDiagramCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <h2 className="font-medium text-gray-700 dark:text-gray-200">Diagram Preview</h2>
            </div>
            <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={downloadDiagram}>
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
        </div>
      </main>

      <SettingsDrawer open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
