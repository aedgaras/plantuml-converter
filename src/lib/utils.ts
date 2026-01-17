import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

const RELATION_BASES = ["--", ".."];
const RELATION_LEFT_DECORATORS = ["<|", "<", "o", "*", ""];
const RELATION_RIGHT_DECORATORS = ["|>", ">", "o", "*", ""];

export const RELATION_SYMBOLS = buildRelationSymbols();

function buildRelationSymbols() {
  const combinations = new Set<string>();

  for (const left of RELATION_LEFT_DECORATORS) {
    for (const base of RELATION_BASES) {
      for (const right of RELATION_RIGHT_DECORATORS) {
        combinations.add(`${left}${base}${right}`);
      }
    }
  }

  return Array.from(combinations).sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
}
