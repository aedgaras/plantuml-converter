import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_PLANTUML } from "../editor/utils";
import { useTransformator } from "../transformator/use-transformator";
import type { PlantUmlFixture } from "./types";
import plantumlEncoder from "plantuml-encoder";

export const useDashboard = () => {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML);
  const [openApiSchema, setOpenApiSchema] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [diagramSize, setDiagramSize] = useState({ width: 0, height: 0 });
  const [fixtures, setFixtures] = useState<PlantUmlFixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const transformRequestRef = useRef(0);
  const transformAbortRef = useRef<AbortController | null>(null);
  const { transform } = useTransformator();
  const fixturesByCategory = useMemo(() => {
    const categoryOrder = [
      "API diagrams",
      "ChatGPT diagrams",
      "Simple diagrams",
      "Test cases",
    ];
    const grouped = fixtures.reduce<Record<string, PlantUmlFixture[]>>(
      (acc, fixture) => {
        if (!acc[fixture.category]) {
          acc[fixture.category] = [];
        }
        acc[fixture.category].push(fixture);
        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        const orderA = categoryOrder.indexOf(a);
        const orderB = categoryOrder.indexOf(b);
        if (orderA !== orderB) {
          return (
            (orderA === -1 ? categoryOrder.length : orderA) -
            (orderB === -1 ? categoryOrder.length : orderB)
          );
        }
        return a.localeCompare(b);
      })
      .map(([category, entries]) => ({
        category,
        fixtures: entries.sort((left, right) =>
          left.label.localeCompare(right.label),
        ),
      }));
  }, [fixtures]);
  const openApiSchemaRoute = useMemo(() => {
    const searchParams = new URLSearchParams({
      uml: plantumlEncoder.encode(plantUmlCode),
    });

    if (selectedFixtureId) {
      searchParams.set("spec", selectedFixtureId);
    }

    return `/api/openapi-schema?${searchParams.toString()}`;
  }, [plantUmlCode, selectedFixtureId]);

  const updateOutputs = useCallback(
    async (uml: string) => {
      const requestId = transformRequestRef.current + 1;
      transformRequestRef.current = requestId;
      transformAbortRef.current?.abort();

      const abortController = new AbortController();
      transformAbortRef.current = abortController;

      setDiagramUrl(
        `https://www.plantuml.com/plantuml/png/${plantumlEncoder.encode(uml)}`,
      );
      setTransformError(null);

      try {
        const schema = await transform(uml, abortController.signal);
        if (requestId !== transformRequestRef.current) {
          return;
        }

        setOpenApiSchema(schema);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error(error);
        setOpenApiSchema("");
        setTransformError(
          error instanceof Error
            ? error.message
            : "Nepavyko transformuoti PlantUML į OpenAPI.",
        );
      }
    },
    [transform],
  );

  useEffect(() => {
    void updateOutputs(DEFAULT_PLANTUML);
  }, [updateOutputs]);

  useEffect(() => {
    return () => {
      transformAbortRef.current?.abort();
    };
  }, []);

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
    void updateOutputs(event);
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
    void updateOutputs(selected.content);
  };

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      const fileContents = await file.text();
      setSelectedFixtureId("");
      setPlantUmlCode(fileContents);
      void updateOutputs(fileContents);
    },
    [updateOutputs],
  );

  return {
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
  };
};
