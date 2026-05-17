"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";

import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { CodeEditor } from "../editor/code-editor";
import { useDashboard } from "./useDashboard";
import { useResiziblePanel } from "./useResizeablePanel";

export default function Dashboard() {
  const {
    diagramUrl,
    diagramSize,
    openApiSchema,
    transformError,
    openApiSchemaRoute,
    selectedFixtureId,
    handleFixtureChange,
    fixturesLoading,
    handleUmlChange,
    handleFileUpload,
    fixturesByCategory,
    fixturesError,
    plantUmlCode,
  } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    EDITOR_PANEL_MIN_SIZE,
    editorPanelDefaultSize,
    DIAGRAM_PANEL_MIN_SIZE,
    diagramPanelMaxSize,
    diagramPanelDefaultSize,
  } = useResiziblePanel(diagramSize);
  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleDownloadSchema = useCallback(() => {
    const schemaBlob = new Blob([openApiSchema], {
      type: "application/yaml;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(schemaBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "openapi-schema.yaml";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }, [openApiSchema]);
  const handleOpenSwaggerEditor = useCallback(() => {
    const schemaUrl = new URL(openApiSchemaRoute, window.location.origin);
    const swaggerEditorUrl = new URL("https://editor.swagger.io/");
    swaggerEditorUrl.searchParams.set("url", schemaUrl.toString());

    window.open(swaggerEditorUrl.toString(), "_blank", "noopener,noreferrer");
  }, [openApiSchemaRoute]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          PlantUML to OpenAPI Converter
        </h1>
      </header>

      <ResizablePanelGroup
        direction="vertical"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel
          defaultSize={editorPanelDefaultSize}
          minSize={EDITOR_PANEL_MIN_SIZE}
          className="min-h-0"
        >
          <main className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-1 flex-col md:flex-row">
              <Panel
                title="PlantUML Input"
                className="h-1/2 w-full border-r border-gray-200 dark:border-gray-700 md:h-full md:w-1/2"
                headerActions={
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".puml,text/plain"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUploadButtonClick}
                      >
                        Upload .puml
                      </Button>
                      <select
                        id="fixture-select"
                        value={selectedFixtureId}
                        onChange={handleFixtureChange}
                        disabled={fixturesLoading}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      >
                        <option value="">
                          {fixturesLoading
                            ? "Loading..."
                            : "Select PlantUML fixture"}
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
                    </div>
                    {fixturesError && (
                      <p className="text-xs text-red-500">{fixturesError}</p>
                    )}
                  </div>
                }
              >
                <CodeEditor
                  value={plantUmlCode}
                  onChange={handleUmlChange}
                  language="plantuml"
                  height="100%"
                />
              </Panel>

              <Panel
                title="OpenAPI Schema"
                className="h-1/2 w-full border-t border-gray-200 dark:border-gray-700 md:h-full md:w-1/2 md:border-t-0"
                headerActions={
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenSwaggerEditor}
                        disabled={!openApiSchema}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Swagger Editor
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSchema}
                        disabled={!openApiSchema}
                      >
                        Download YAML
                      </Button>
                    </div>
                    {transformError && (
                      <p className="text-xs text-red-500">{transformError}</p>
                    )}
                  </div>
                }
              >
                <CodeEditor
                  value={openApiSchema}
                  onChange={() => {}}
                  language="yaml"
                  height="100%"
                  readOnly={true}
                />
              </Panel>
            </div>
          </main>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-200 dark:bg-gray-700" />

        <ResizablePanel
          defaultSize={diagramPanelDefaultSize}
          minSize={DIAGRAM_PANEL_MIN_SIZE}
          maxSize={diagramPanelMaxSize}
          className="min-h-0"
        >
          <div className="flex h-full flex-col gap-4 p-4 pt-0 lg:flex-row">
            <Panel
              title="PlantUML Diagram"
              className="min-h-[14rem] flex-1"
              contentClassName="bg-white dark:bg-gray-900 min-h-0"
            >
              <DiagramPreview
                diagramUrl={diagramUrl}
                diagramSize={diagramSize}
                label="PlantUML Diagram"
              />
            </Panel>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

type PanelProps = {
  title: string;
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

function Panel({
  title,
  children,
  headerActions,
  className,
  contentClassName,
}: PanelProps) {
  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      <PanelHeader title={title} actions={headerActions} />
      <div className={cn("flex-1 overflow-hidden min-h-0", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

type PanelHeaderProps = {
  title: string;
  actions?: ReactNode;
};

function PanelHeader({ title, actions }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <h2 className="font-medium text-gray-700 dark:text-gray-200">{title}</h2>
      {actions}
    </div>
  );
}

type DiagramPreviewProps = {
  diagramUrl: string;
  diagramSize: { width: number; height: number };
  label: string;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function DiagramPreview({
  diagramUrl,
  diagramSize,
  label,
}: DiagramPreviewProps) {
  const fallbackUrl = diagramUrl || "./placeholder.svg";
  const previewAlt = label;
  const dialogScroll = useDraggableScroll();
  const [zoomLevel, setZoomLevel] = useState(1);
  const clampZoom = useCallback(
    (nextZoom: number) =>
      Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number.isFinite(nextZoom) ? nextZoom : 1),
      ),
    [],
  );
  const adjustZoom = useCallback(
    (delta: number) => {
      setZoomLevel((prev) => clampZoom(prev + delta));
    },
    [clampZoom],
  );
  const handleZoomIn = useCallback(() => adjustZoom(ZOOM_STEP), [adjustZoom]);
  const handleZoomOut = useCallback(() => adjustZoom(-ZOOM_STEP), [adjustZoom]);
  const handleZoomReset = useCallback(() => setZoomLevel(1), []);
  const handleWheelZoom = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      adjustZoom(direction * ZOOM_STEP);
    },
    [adjustZoom],
  );

  useEffect(() => {
    setZoomLevel(1);
  }, [diagramUrl]);

  const zoomPercent = Math.round(zoomLevel * 100);
  const scaledWidth =
    diagramSize.width && diagramSize.width > 0
      ? diagramSize.width * zoomLevel
      : undefined;
  const scaledHeight =
    diagramSize.height && diagramSize.height > 0
      ? diagramSize.height * zoomLevel
      : undefined;
  const previewImage = (
    <img
      src={fallbackUrl}
      alt={previewAlt}
      width={diagramSize.width || undefined}
      height={diagramSize.height || undefined}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
      }}
      className="pointer-events-none select-none"
    />
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-full min-h-0 w-full cursor-zoom-in items-center justify-center overflow-auto p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          aria-label={`Open ${label} preview in a larger view`}
        >
          {previewImage}
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-w-[90rem] bg-white dark:bg-gray-900 sm:max-w-[90rem]"
        aria-describedby="diagram-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription id="diagram-dialog-description">
            Scroll or drag this larger view to inspect details.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={dialogScroll.containerRef}
          onPointerDown={dialogScroll.handlePointerDown}
          onPointerMove={dialogScroll.handlePointerMove}
          onPointerUp={dialogScroll.handlePointerUp}
          onPointerLeave={dialogScroll.handlePointerUp}
          onPointerCancel={dialogScroll.handlePointerUp}
          onWheel={handleWheelZoom}
          tabIndex={-1}
          className={cn(
            "relative max-h-[80vh] min-h-[50vh] w-full overflow-auto rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950",
            dialogScroll.isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <img
            src={fallbackUrl}
            alt={previewAlt}
            width={scaledWidth}
            height={scaledHeight}
            style={{
              width: scaledWidth ?? undefined,
              height: scaledHeight ?? undefined,
            }}
            className="mx-auto block select-none max-w-none"
          />
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Zoom: {zoomPercent}%
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
            >
              -
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleZoomReset}
              disabled={zoomLevel === 1}
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
            >
              +
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DraggableScroll = {
  containerRef: RefObject<HTMLDivElement | null>;
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  isDragging: boolean;
};

function useDraggableScroll(): DraggableScroll {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      event.preventDefault();
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
      };
      setIsDragging(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) {
        return;
      }

      const element = containerRef.current;
      if (!element) {
        return;
      }

      event.preventDefault();
      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      element.scrollLeft = dragState.current.scrollLeft - deltaX;
      element.scrollTop = dragState.current.scrollTop - deltaY;
    },
    [isDragging],
  );

  const endDragging = useCallback(() => {
    setIsDragging(false);
    const element = containerRef.current;
    const { pointerId } = dragState.current;
    if (element && pointerId !== -1) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // no-op if pointer capture was already released
      }
    }
    dragState.current.pointerId = -1;
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) {
        return;
      }

      event.preventDefault();
      endDragging();
    },
    [endDragging, isDragging],
  );

  return {
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDragging,
  };
}
