import { describe, expect, it } from "vitest";

import { loadPlantUmlFixtures } from "./fixtures";

describe("loadPlantUmlFixtures", () => {
  it("includes petstore as an API diagram fixture with a stable id", async () => {
    const fixtures = await loadPlantUmlFixtures();
    const petstore = fixtures.find((fixture) => fixture.id === "petstore");

    expect(petstore).toBeTruthy();
    expect(petstore).toMatchObject({
      id: "petstore",
      fileName: "petstore.puml",
      label: "Petstore",
      category: "API diagrams",
    });
    expect(petstore?.content).toContain("@startuml");
  });
});
