import { promises as fs } from "fs";
import path from "path";

type FixtureSource = {
  directory: string;
  extension: string;
  category: string;
};

export type FixtureFile = {
  id: string;
  fileName: string;
  label: string;
  content: string;
  category: string;
};

const FIXTURE_SOURCES: FixtureSource[] = [
  {
    directory: path.join(process.cwd(), "src/lib/puml"),
    extension: ".puml",
    category: "API diagrams",
  },
];

const CATEGORY_MAP = {
  api: "API diagrams",
  chatgpt: "ChatGPT diagrams",
  simple: "Simple diagrams",
} as const;

const EXCLUDED_FIXTURE_FILES = new Set(["plantuml-transform-activity.puml"]);

function determineCategory(fileName: string, fallback: string): string {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("chat-gpt") || normalized.includes("chatgtp")) {
    return CATEGORY_MAP.chatgpt;
  }

  if (
    normalized.includes("simple") ||
    normalized.includes("plantuml-to-openapi-flow") ||
    normalized.includes("support-ticket")
  ) {
    return CATEGORY_MAP.simple;
  }

  return CATEGORY_MAP.api ?? fallback;
}

function formatLabel(fileName: string): string {
  const withoutExt = fileName.replace(/\.(plant|puml)$/, "");
  const segments = withoutExt.split("-");

  const formattedSegments = segments.map((segment, index) => {
    if (index === 0 && /^[a-z]+\d+$/i.test(segment)) {
      return segment.toUpperCase();
    }
    if (segment.length === 0) {
      return segment;
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
  });

  return formattedSegments.join(" ").trim();
}

async function loadFixturesFromSource({
  directory,
  extension,
  category,
}: FixtureSource): Promise<FixtureFile[]> {
  const entries = await fs.readdir(directory);
  const files = entries
    .filter((file) => file.endsWith(extension))
    .filter((file) => !EXCLUDED_FIXTURE_FILES.has(file))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(directory, fileName);
      const content = await fs.readFile(filePath, "utf8");
      return {
        id: fileName.replace(/\.(plant|puml)$/, ""),
        fileName,
        label: formatLabel(fileName),
        content,
        category,
      };
    }),
  );
}

export async function loadPlantUmlFixtures(): Promise<FixtureFile[]> {
  const fixturesFromSources = await Promise.all(
    FIXTURE_SOURCES.map(async (source) => {
      try {
        return await loadFixturesFromSource(source);
      } catch (error) {
        console.error(
          `Failed to read PlantUML fixtures from ${source.directory}`,
          error,
        );
        return [];
      }
    }),
  );

  return fixturesFromSources
    .flat()
    .map((fixture) => ({
      ...fixture,
      category: determineCategory(fixture.fileName, fixture.category),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
