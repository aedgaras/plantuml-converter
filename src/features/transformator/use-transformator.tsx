import { transformPlantUmlToOpenApi } from "./shared/shared-transformator";

export function useTransformator() {
  return {
    transform: transformPlantUmlToOpenApi,
  };
}
