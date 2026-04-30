import { NextRequest, NextResponse } from "next/server";
import plantumlEncoder from "plantuml-encoder";

import { transformPlantUmlToOpenApiYaml } from "@/src/features/transformator/shared/shared-transformator";

export async function GET(request: NextRequest) {
  const encodedPlantUml = request.nextUrl.searchParams.get("uml");

  if (!encodedPlantUml) {
    return NextResponse.json(
      { error: 'Missing required "uml" query parameter.' },
      { status: 400 },
    );
  }

  try {
    const plantUmlSource = plantumlEncoder.decode(encodedPlantUml);
    const openApiSchema = transformPlantUmlToOpenApiYaml(plantUmlSource);

    return new NextResponse(openApiSchema, {
      status: 200,
      headers: {
        "content-type": "application/yaml; charset=utf-8",
        "content-disposition": 'inline; filename="openapi-schema.yaml"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export OpenAPI schema", error);

    return NextResponse.json(
      { error: "Unable to generate OpenAPI schema export." },
      { status: 400 },
    );
  }
}
