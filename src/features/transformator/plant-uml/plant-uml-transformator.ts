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

type ClassAndInterfaceCollection = {
  classes: UMLClassLike[];
  interfaces: UMLClassLike[];
};

/**
 * Converts a PlantUML textual diagram into an intermediate UML diagram object.
 */
export function transformPlantUML(umlText: string): UMLDiagram {
  const normalizedText = normalizeUmlText(umlText);
  const { classes, interfaces } = parseClassLikeDeclarations(normalizedText);
  const enums = parseEnumDeclarations(normalizedText);
  const relations = parseRelations(normalizedText);

  return {
    classes,
    interfaces,
    enums,
    relations,
  };
}

/**
 * Ensures predictable line endings for downstream parsing.
 */
function normalizeUmlText(umlText: string): string {
  return umlText.replace(/\r\n/g, "\n");
}

/**
 * Extracts class and interface definitions from the UML source.
 */
function parseClassLikeDeclarations(
  umlText: string
): ClassAndInterfaceCollection {
  const classLikeRegex = /(class|interface)\s+(\w+)\s*\{([^}]*)\}/g;
  const classes: UMLClassLike[] = [];
  const interfaces: UMLClassLike[] = [];

  let match: RegExpExecArray | null;
  while ((match = classLikeRegex.exec(umlText)) !== null) {
    const [, rawType, name, body] = match;
    const entity = buildClassLikeEntity(rawType as UMLClassType, name, body);

    if (rawType === "interface") {
      interfaces.push(entity);
    } else {
      classes.push(entity);
    }
  }

  return { classes, interfaces };
}

/**
 * Builds a single UML class or interface from its raw declaration.
 */
function buildClassLikeEntity(
  type: UMLClassType,
  name: string,
  body: string
): UMLClassLike {
  const { attributes, methods } = parseClassMembers(body);
  return { name, type, attributes, methods };
}

/**
 * Splits a class body into individual member definitions and parses each one.
 */
function parseClassMembers(body: string): {
  attributes: UMLAttribute[];
  methods: UMLMethod[];
} {
  const attributes: UMLAttribute[] = [];
  const methods: UMLMethod[] = [];

  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const member = parseClassMember(line);
    if (!member) {
      continue;
    }

    if (member.kind === "attribute") {
      attributes.push(member.value);
    } else {
      methods.push(member.value);
    }
  }

  return { attributes, methods };
}

type ParsedMember =
  | { kind: "attribute"; value: UMLAttribute }
  | { kind: "method"; value: UMLMethod };

/**
 * Parses a single class member, distinguishing between attributes and methods.
 */
function parseClassMember(line: string): ParsedMember | undefined {
  const accessSymbol = line.charAt(0);
  const access = parseAccessModifier(accessSymbol);
  const clean = line.replace(/^(\+|-|#|~)/, "").trim();

  if (!clean) {
    return undefined;
  }

  if (clean.includes("(")) {
    const methodMatch = /^(\w+)\s*\(.*\)\s*:?(\s*\w+)?/.exec(clean);
    if (!methodMatch) {
      return undefined;
    }

    const [, name, returnType] = methodMatch;
    return {
      kind: "method",
      value: { name, returnType: returnType?.trim(), access },
    };
  }

  const attrMatch = /^(\w+)\s*:\s*(\w+)?/.exec(clean);
  if (!attrMatch) {
    return undefined;
  }

  const [, name, type] = attrMatch;
  return {
    kind: "attribute",
    value: { name, type, access },
  };
}

/**
 * Parses enums declared in the UML diagram.
 */
function parseEnumDeclarations(umlText: string): UMLEnum[] {
  const enums: UMLEnum[] = [];
  const enumRegex = /enum\s+(\w+)\s*\{([^}]*)\}/g;

  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(umlText)) !== null) {
    const [, name, body] = match;
    const values = body
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    enums.push({ name, values });
  }

  return enums;
}

/**
 * Parses relationship lines in the UML diagram.
 */
function parseRelations(umlText: string): UMLRelation[] {
  const relations: UMLRelation[] = [];

  for (const line of umlText.split("\n")) {
    const relation = parseRelationLine(line);
    if (relation) {
      relations.push(relation);
    }
  }

  return relations;
}

/**
 * Parses a single relation line into a structured representation.
 */
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

/**
 * Finds the first relation symbol in a line, ignoring quoted text.
 */
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

/**
 * Determines whether a dot belongs to a cardinality rather than a relation symbol.
 */
function isCardinalityDot(prev: string, next: string) {
  const prevIsCardinality = Boolean(prev) && /[0-9*]/.test(prev);
  const nextIsCardinality = Boolean(next) && /[0-9*]/.test(next);
  return prevIsCardinality && nextIsCardinality;
}

/**
 * Parses the endpoints of a relation and extracts cardinality notes.
 */
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

/**
 * Maps PlantUML access symbols to their semantic value.
 */
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

/**
 * Maps PlantUML relation symbols to a friendly type.
 */
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

/**
 * Parses cardinality fragments (e.g. `1..*`) into structured values.
 */
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
