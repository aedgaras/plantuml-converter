import { transform } from "./transformator";

export function useTransformator() {
  return {
    transform: transform,
  };
}
