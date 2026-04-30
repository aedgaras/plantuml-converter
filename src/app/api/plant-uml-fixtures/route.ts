import { NextResponse } from "next/server";
import { loadPlantUmlFixtures } from "./fixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fixtures = await loadPlantUmlFixtures();
    return NextResponse.json(fixtures);
  } catch (error) {
    console.error("Failed to read PlantUML fixtures", error);
    return NextResponse.json(
      { error: "Unable to load PlantUML fixtures" },
      { status: 500 },
    );
  }
}
