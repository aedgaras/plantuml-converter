import { useState, useEffect, useMemo } from "react";

export const useResiziblePanel = (diagramSize: { width: number; height: number }) => {
  const DIAGRAM_PANEL_MIN_SIZE = 20;
  const DIAGRAM_PANEL_DEFAULT_SIZE = 30;
  const DIAGRAM_PANEL_MAX_CAP = 85;
  const FALLBACK_DIAGRAM_PANEL_MAX_SIZE = 60;
  const DIAGRAM_PANEL_PADDING = 160;
  const EDITOR_PANEL_MIN_SIZE = 40;
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const diagramPanelMaxSize = useMemo(() => {
    if (!viewportHeight || !diagramSize.height) {
      return FALLBACK_DIAGRAM_PANEL_MAX_SIZE;
    }

    const paddedHeight = diagramSize.height + DIAGRAM_PANEL_PADDING;
    const percent = (paddedHeight / viewportHeight) * 100;

    return Math.min(
      DIAGRAM_PANEL_MAX_CAP,
      Math.max(DIAGRAM_PANEL_MIN_SIZE, percent)
    );
  }, [diagramSize.height, viewportHeight]);

  const diagramPanelDefaultSize = useMemo(
    () => Math.min(DIAGRAM_PANEL_DEFAULT_SIZE, diagramPanelMaxSize),
    [diagramPanelMaxSize]
  );

  const editorPanelDefaultSize = useMemo(
    () => 100 - diagramPanelDefaultSize,
    [diagramPanelDefaultSize]
  );

  return {
    EDITOR_PANEL_MIN_SIZE,
    editorPanelDefaultSize,
    DIAGRAM_PANEL_MIN_SIZE,
    diagramPanelMaxSize,
    diagramPanelDefaultSize,
  };
};
