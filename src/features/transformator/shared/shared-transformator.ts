import { transformToOpenApi } from "../open-api/open-api-transformator";
import { transformPlantUML } from "../plant-uml/plant-uml-transformator";
import YAML from "yaml";

export function transformPlantUmlToOpenApi<OpenApiDocument>(
  plantUmlDiagram: string,
) {
  const plantUmlObjects = transformPlantUML(plantUmlDiagram);
  return transformToOpenApi(plantUmlObjects);
}

export function transformPlantUmlToOpenApiYaml(plantUmlDiagram: string) {
  return YAML.stringify(transformPlantUmlToOpenApi(plantUmlDiagram));
}

export function stringifyOpenApiDocument(openApiDocument: unknown) {
  return YAML.stringify(openApiDocument);
}
