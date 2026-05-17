import { useCallback } from "react";

type TransformResponse = {
  openApiSchema: string;
  error?: string;
};

export function useTransformator() {
  const transform = useCallback(
    async (plantUml: string, signal?: AbortSignal) => {
      const response = await fetch("/api/openapi-schema", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ plantUml }),
        signal,
      });
      const payload = (await response.json()) as TransformResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to transform PlantUML.");
      }

      return payload.openApiSchema;
    },
    [],
  );

  return {
    transform,
  };
}
