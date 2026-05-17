import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import plantumlEncoder from "plantuml-encoder";

import {
  transformPlantUmlToOpenApi,
  transformPlantUmlToOpenApiYaml,
  stringifyOpenApiDocument,
} from "../../../features/transformator/shared/shared-transformator";

type TransformRequestBody = {
  plantUml?: unknown;
};

const TRANSFORMED_SPEC_DIRECTORY = path.join(process.cwd(), "src/lib/specs");

function createYamlResponse(yaml: string, fileName: string) {
  return new NextResponse(yaml, {
    status: 200,
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      "content-disposition": `inline; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}

async function loadTransformedSpec(spec: string) {
  if (!/^[a-z0-9-]+$/i.test(spec)) {
    return null;
  }

  const candidates = [
    `${spec}-transformed.yaml`,
    `${spec}-api-transformed.yaml`,
    `${spec}-api-spec-transformed.yaml`,
    `${spec}-spec-transformed.yaml`,
  ];

  for (const fileName of candidates) {
    try {
      const yaml = await fs.readFile(
        path.join(TRANSFORMED_SPEC_DIRECTORY, fileName),
        "utf8",
      );
      return { fileName, yaml };
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const transformedSpec = request.nextUrl.searchParams.get("spec");
  const encodedPlantUml = request.nextUrl.searchParams.get("uml");

  if (transformedSpec) {
    try {
      const spec = await loadTransformedSpec(transformedSpec);

      if (!spec) {
        return NextResponse.json(
          { error: "Transformed OpenAPI spec was not found." },
          { status: 404 },
        );
      }

      return createYamlResponse(spec.yaml, spec.fileName);
    } catch (error) {
      console.error("Failed to load transformed OpenAPI spec", error);

      return NextResponse.json(
        { error: "Unable to load transformed OpenAPI spec." },
        { status: 500 },
      );
    }
  }

  if (!encodedPlantUml) {
    return NextResponse.json(
      { error: 'Missing required "uml" or "spec" query parameter.' },
      { status: 400 },
    );
  }

  try {
    const plantUmlSource = plantumlEncoder.decode(encodedPlantUml);
    const openApiSchema = transformPlantUmlToOpenApiYaml(plantUmlSource);

    return createYamlResponse(openApiSchema, "openapi-schema.yaml");
  } catch (error) {
    console.error("Failed to export OpenAPI schema", error);

    return NextResponse.json(
      { error: "Unable to generate OpenAPI schema export." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  let requestBody: TransformRequestBody;

  try {
    requestBody = (await request.json()) as TransformRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    !requestBody ||
    typeof requestBody !== "object" ||
    typeof requestBody.plantUml !== "string"
  ) {
    return NextResponse.json(
      { error: 'Missing required "plantUml" string field.' },
      { status: 400 },
    );
  }

  try {
    const openApiDocument = transformPlantUmlToOpenApi(requestBody.plantUml);

    return NextResponse.json(
      {
        openApiSchema: stringifyOpenApiDocument(openApiDocument),
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to transform PlantUML to OpenAPI", error);

    return NextResponse.json(
      { error: "Unable to transform PlantUML to OpenAPI." },
      { status: 400 },
    );
  }
}
