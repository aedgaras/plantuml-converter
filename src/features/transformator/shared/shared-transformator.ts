import {
  transformToOpenApi,
  transformToOpenApiResult,
} from "../open-api/open-api-transformator";
import { transformPlantUML } from "../plant-uml/plant-uml-transformator";
import { TransformOptions } from "./transform-diagnostics";
import YAML from "yaml";

export function transformPlantUmlToOpenApi<OpenApiDocument>(
  plantUmlDiagram: string,
  options?: TransformOptions,
) {
  const plantUmlObjects = transformPlantUML(plantUmlDiagram);
  return transformToOpenApi(plantUmlObjects, options);
}

export function transformPlantUmlToOpenApiResult(plantUmlDiagram: string) {
  const plantUmlObjects = transformPlantUML(plantUmlDiagram);
  return transformToOpenApiResult(plantUmlObjects);
}

export function transformPlantUmlToOpenApiYaml(
  plantUmlDiagram: string,
  options?: TransformOptions,
) {
  return YAML.stringify(transformPlantUmlToOpenApi(plantUmlDiagram, options));
}

export function stringifyOpenApiDocument(openApiDocument: unknown) {
  return YAML.stringify(openApiDocument);
}
