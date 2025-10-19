import { RELATION_SYMBOLS } from "../../../lib/utils";
import {
  AccessModifier,
  UMLAttribute,
  UMLCardinality,
  UMLClassLike,
  UMLClassType,
  UMLDiagram,
  UMLEnum,
  UMLMethod,
  UMLRelation,
} from "./plant-uml-types";

export function transformPlantUML(umlText: string) {
  const classes: UMLClassLike[] = [];
  const interfaces: UMLClassLike[] = [];
  const enums: UMLEnum[] = [];
  const relations: UMLRelation[] = [];

  // Normalize newlines
  umlText = umlText.replace(/\r\n/g, "\n");

  // --- Parse Classes and Interfaces ---
  const classLikeRegex = /(class|interface)\s+(\w+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = classLikeRegex.exec(umlText)) !== null) {
    const [, type, name, body] = match;
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const attributes: UMLAttribute[] = [];
    const methods: UMLMethod[] = [];

    for (const line of lines) {
      const accessSymbol = line.charAt(0);
      const access = parseAccessModifier(accessSymbol);
      const clean = line.replace(/^(\+|-|#|~)/, "").trim();

      if (clean.includes("(")) {
        // Method
        const methodMatch = /^(\w+)\s*\(.*\)\s*:?(\s*\w+)?/.exec(clean);
        if (methodMatch) {
          const [, name, returnType] = methodMatch;
          methods.push({ name, returnType: returnType?.trim(), access });
        }
      } else {
        // Attribute
        const attrMatch = /^(\w+)\s*:\s*(\w+)?/.exec(clean);
        if (attrMatch) {
          const [, name, type] = attrMatch;
          attributes.push({ name, type, access });
        }
      }
    }

    const obj: UMLClassLike = {
      name: name,
      type: type as UMLClassType,
      attributes: attributes,
      methods: methods,
    };

    if (type === "interface") {
      interfaces.push(obj);
    } else {
      classes.push(obj);
    }
  }

  // --- Parse Enums ---
  const enumRegex = /enum\s+(\w+)\s*\{([^}]*)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(umlText)) !== null) {
    const [, name, body] = enumMatch;
    const values = body
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    enums.push({ name, values });
  }

  // --- Parse Relations ---
  for (const line of umlText.split("\n")) {
    const relation = parseRelationLine(line);
    if (relation) {
      relations.push(relation);
    }
  }

  const diagram: UMLDiagram = { classes, interfaces, enums, relations };
  if (classes) {
    diagram.classes = classes;
  }
  if (interfaces) {
    diagram.interfaces = interfaces;
  }
  if (enums) {
    diagram.enums = enums;
  }
  if (relations) {
    diagram.relations = relations;
  }
  return diagram;
}

function parseRelationLine(line: string): UMLRelation | undefined {
  const trimmed = line.trim();
  if (!trimmed || !/[<>|o*.-]/.test(trimmed)) {
    return undefined;
  }

  const symbolMatch = findRelationSymbol(trimmed);
  if (!symbolMatch) {
    return undefined;
  }

  const { symbol, index } = symbolMatch;
  const leftRaw = trimmed.slice(0, index).trim();
  let rightRaw = trimmed.slice(index + symbol.length).trim();

  if (!leftRaw || !rightRaw) {
    return undefined;
  }

  const colonIndex = rightRaw.indexOf(":");
  if (colonIndex !== -1) {
    rightRaw = rightRaw.slice(0, colonIndex).trim();
  }

  const fromParsed = parseRelationEndpoint(leftRaw);
  const toParsed = parseRelationEndpoint(rightRaw);
  if (!fromParsed || !toParsed) {
    return undefined;
  }

  const fromCardinality = parseCardinality(fromParsed.cardinalityRaw);
  const toCardinality = parseCardinality(toParsed.cardinalityRaw);

  return {
    from: fromParsed.name,
    to: toParsed.name,
    type: mapRelation(symbol),
    fromCardinality,
    toCardinality,
    cardinality: toCardinality,
  };
}

function findRelationSymbol(
  line: string
): { symbol: string; index: number } | undefined {
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (insideQuotes) {
      continue;
    }

    for (const symbol of RELATION_SYMBOLS) {
      if (line.startsWith(symbol, index)) {
        if (
          symbol === ".." &&
          isCardinalityDot(
            line.charAt(index - 1),
            line.charAt(index + symbol.length)
          )
        ) {
          continue;
        }

        return { symbol, index };
      }
    }
  }

  return undefined;
}

function isCardinalityDot(prev: string, next: string) {
  const prevIsCardinality = Boolean(prev) && /[0-9*]/.test(prev);
  const nextIsCardinality = Boolean(next) && /[0-9*]/.test(next);
  return prevIsCardinality && nextIsCardinality;
}

function parseRelationEndpoint(
  segment: string
): { name: string; cardinalityRaw?: string } | undefined {
  const tokens = segment
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return undefined;
  }

  let name: string | undefined;
  let cardinality: string | undefined;

  for (const token of tokens) {
    const quoted = token.match(/^"(.*)"$/);
    if (quoted) {
      cardinality = quoted[1].trim();
      continue;
    }

    if (/^[0-9.*]+$/.test(token) && /[0-9]/.test(token)) {
      cardinality = token;
      continue;
    }

    if (token === "*") {
      cardinality = token;
      continue;
    }

    name = token;
  }

  if (!name) {
    return undefined;
  }

  return { name, cardinalityRaw: cardinality };
}

export function parseAccessModifier(symbol: string): AccessModifier {
  switch (symbol) {
    case "+":
      return "public";
    case "-":
      return "private";
    case "#":
      return "protected";
    case "~":
      return "package";
    default:
      return "public";
  }
}

export function mapRelation(symbol: string): UMLRelation["type"] {
  if (symbol.includes("<|--") || symbol.includes("--|>")) return "inheritance";
  if (symbol.includes("*--") || symbol.includes("--*")) return "composition";
  if (symbol.includes("o--") || symbol.includes("--o")) return "aggregation";
  if (
    symbol.includes("<..") ||
    symbol.includes("..>") ||
    symbol.includes("..|>") ||
    symbol.includes("<|..")
  )
    return "dependency";
  if (symbol.includes("--") || symbol.includes("..")) return "association";
  return "unknown";
}

function parseCardinality(raw?: string): UMLCardinality | undefined {
  if (!raw) {
    return undefined;
  }

  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  if (value === "*") {
    return { type: "many", raw: value };
  }

  if (/^\d+$/.test(value)) {
    return { type: "exact", raw: value, value: Number(value) };
  }

  const rangeMatch = value.match(/^(\d+|\*)\.\.(\d+|\*)$/);
  if (rangeMatch) {
    const [, minRaw, maxRaw] = rangeMatch;
    const min = minRaw === "*" ? undefined : Number(minRaw);
    const max = maxRaw === "*" ? undefined : Number(maxRaw);
    return { type: "range", raw: value, min, max };
  }

  return { type: "custom", raw: value, label: value };
}
