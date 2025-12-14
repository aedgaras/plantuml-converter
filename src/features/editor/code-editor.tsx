"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { definePlantUmlLanguage } from "./utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string | number;
  className?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = "100%",
  className = "",
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define PlantUML language if it's being used
    if (language === "plantuml") {
      try {
        definePlantUmlLanguage(monaco);
      } catch (error) {
        console.error("Error defining PlantUML language:", error);
      }
    }

    // Configure editor
    try {
      editor.updateOptions({
        readOnly: readOnly,
        tabSize: 2,
        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        minimap: {
          enabled: false,
        },
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        wordWrap: "on",
        fixedOverflowWidgets: true,
      });
    } catch (error) {
      console.error("Error updating editor options:", error);
    }

    // Force layout update
    try {
      editor.layout();
    } catch (error) {
      console.error("Error updating editor layout:", error);
    }
  };

  return (
    <div className={cn("h-full w-full relative overflow-hidden", className)}>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(value) => onChange(value || "")}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          fontFamily: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: true,
          scrollBeyondLastLine: true,
          minimap: { enabled: false },
          fixedOverflowWidgets: true,
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            alwaysConsumeMouseWheel: false,
          },
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
