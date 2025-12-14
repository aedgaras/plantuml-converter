import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const FIXTURES_DIR = path.join(
  process.cwd(),
  "src/features/transformator/plant-uml/fixtures"
);

type FixtureFile = {
  id: string;
  fileName: string;
  label: string;
  content: string;
};

function formatLabel(fileName: string): string {
  const withoutExt = fileName.replace(/\.plant$/, "");
  const [rawId, ...rest] = withoutExt.split("-");
  const id = rawId?.toUpperCase() ?? withoutExt;
  const title = rest
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  return title ? `${id} ${title}` : id;
}

export async function GET() {
  try {
    const entries = await fs.readdir(FIXTURES_DIR);
    const files = entries.filter((file) => file.endsWith(".plant")).sort();
    const fixtures: FixtureFile[] = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(FIXTURES_DIR, fileName);
        const content = await fs.readFile(filePath, "utf8");
        return {
          id: fileName.replace(/\.plant$/, ""),
          fileName,
          label: formatLabel(fileName),
          content,
        };
      })
    );

    return NextResponse.json(fixtures);
  } catch (error) {
    console.error("Failed to read PlantUML fixtures", error);
    return NextResponse.json(
      { error: "Unable to load PlantUML fixtures" },
      { status: 500 }
    );
  }
}
