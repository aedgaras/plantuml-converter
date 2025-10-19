import { transformToOpenApi } from "../open-api/open-api-transformator";
import { transformPlantUML } from "../plant-uml/plant-uml-transformator";

export function transformPlantUmlToOpenApi<OpenApiDocument>(
  plantUmlDiagram: string
) {
  const plantUmlObjects = transformPlantUML(plantUmlDiagram);
  return transformToOpenApi(plantUmlObjects);
}
