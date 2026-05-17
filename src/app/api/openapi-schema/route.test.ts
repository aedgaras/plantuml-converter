import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

describe("/api/openapi-schema", () => {
  it("returns a pre-transformed OpenAPI YAML spec by fixture id", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/openapi-schema?spec=person"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/yaml");
    expect(response.headers.get("content-disposition")).toContain(
      "person-transformed.yaml",
    );
    expect(body).toContain("openapi: 3.1.0");
    expect(body).toContain("Person:");
  });

  it("transforms PlantUML from the POST body into OpenAPI YAML", async () => {
    const plantUml = [
      "@startuml",
      "class Person {",
      "  +name: String",
      "}",
      "@enduml",
    ].join("\n");

    const response = await POST(
      new NextRequest("http://localhost/api/openapi-schema", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          plantUml,
        }),
      }),
    );

    const payload = (await response.json()) as { openApiSchema: string };

    expect(response.status).toBe(200);
    expect(payload.openApiSchema).toContain("openapi: 3.1.0");
    expect(payload.openApiSchema).toContain("Person:");
    expect(payload.openApiSchema).toContain("name:");
  });
});
