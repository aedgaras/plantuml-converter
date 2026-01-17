import { useState, useMemo, useCallback, useEffect, ChangeEvent } from "react";
import { DEFAULT_PLANTUML } from "../editor/utils";
import { OpenApiDocument } from "../transformator/open-api/open-api-types";
import { useTransformator } from "../transformator/use-transformator";
import { buildOpenApiPlantUmlDiagram } from "./utils";
import YAML from "yaml";
import { PlantUmlFixture } from "./types";
import plantumlEncoder from "plantuml-encoder";

export const useDashboard = () => {
  const [plantUmlCode, setPlantUmlCode] = useState(DEFAULT_PLANTUML);
  const [openApiSchema, setOpenApiSchema] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [diagramSize, setDiagramSize] = useState({ width: 0, height: 0 });
  const [openApiDiagramSize, setOpenApiDiagramSize] = useState({
    width: 0,
    height: 0,
  });
  const [openApiDiagram, setOpenApiDiagram] = useState<OpenApiDocument | null>(
    null
  );
  const [fixtures, setFixtures] = useState<PlantUmlFixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const { transform } = useTransformator();
  const fixturesByCategory = useMemo(() => {
    const categoryOrder = ["Test cases", "API diagrams"];
    const grouped = fixtures.reduce<Record<string, PlantUmlFixture[]>>(
      (acc, fixture) => {
        if (!acc[fixture.category]) {
          acc[fixture.category] = [];
        }
        acc[fixture.category].push(fixture);
        return acc;
      },
      {}
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
          left.label.localeCompare(right.label)
        ),
      }));
  }, [fixtures]);

  const openApiPlantUmlDefinition = useMemo(
    () => buildOpenApiPlantUmlDiagram(openApiDiagram),
    [openApiDiagram]
  );

  const openApiDiagramUrl = useMemo(() => {
    if (!openApiPlantUmlDefinition) {
      return "";
    }

    return `https://www.plantuml.com/plantuml/png/${plantumlEncoder.encode(
      openApiPlantUmlDefinition
    )}`;
  }, [openApiPlantUmlDefinition]);

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
    if (!openApiDiagramUrl) {
      setOpenApiDiagramSize({ width: 0, height: 0 });
      return;
    }

    let isCancelled = false;
    const image = new Image();
    image.src = openApiDiagramUrl;
    image.onload = () => {
      if (isCancelled) return;
      setOpenApiDiagramSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      if (isCancelled) return;
      setOpenApiDiagramSize({ width: 0, height: 0 });
    };

    return () => {
      isCancelled = true;
    };
  }, [openApiDiagramUrl]);

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

  return {
    diagramUrl,
    diagramSize,
    openApiDiagramUrl,
    openApiDiagramSize,
    openApiSchema,
    selectedFixtureId,
    handleFixtureChange,
    fixturesLoading,
    handleUmlChange,
    fixturesByCategory,
    fixturesError,
    plantUmlCode,
  };
};
