import { RELATION_SYMBOLS } from "../../../lib/utils";
import {
  normalizeComponentName,
  normalizePropertyName,
} from "../shared/naming-rules";
import { applyDiagramRules } from "../shared/transform-rules";
import {
  AccessModifier,
  UMLAttribute,
  UMLAttributeAnnotations,
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

  return applyDiagramRules({
    classes,
    interfaces,
    enums,
    relations,
  });
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
  umlText: string,
): ClassAndInterfaceCollection {
  const classes: UMLClassLike[] = [];
  const interfaces: UMLClassLike[] = [];
  const classLikePattern = /(class|interface)\b/g;
  let match: RegExpExecArray | null;

  while ((match = classLikePattern.exec(umlText)) !== null) {
    const rawType = match[1] as UMLClassType;
    const block = extractNamedBlock(umlText, classLikePattern.lastIndex);
    if (!block) {
      continue;
    }

    const entity = buildClassLikeEntity(
      rawType,
      block.rawName,
      block.body,
      block.stereotypes,
    );
    if (rawType === "interface") {
      interfaces.push(entity);
    } else {
      classes.push(entity);
    }

    classLikePattern.lastIndex = block.endIndex + 1;
  }

  return { classes, interfaces };
}

/**
 * Builds a single UML class or interface from its raw declaration.
 */
function buildClassLikeEntity(
  type: UMLClassType,
  name: string,
  body: string,
  stereotypes: string[],
): UMLClassLike {
  const normalizedName = normalizeComponentName(name);
  const { attributes, methods } = parseClassMembers(body);
  return {
    name: normalizedName,
    rawName: name,
    type,
    attributes,
    methods,
    stereotypes,
  };
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
  let clean = line.trim();
  if (!clean) {
    return undefined;
  }

  const { value: undecorated, annotations, optional, unsupportedTokens } =
    extractMemberAnnotations(clean);
  clean = undecorated;
  if (!clean) {
    return undefined;
  }

  let access: AccessModifier = "public";
  const accessSymbol = clean.charAt(0);
  if (/^[+\-#~]$/.test(accessSymbol)) {
    access = parseAccessModifier(accessSymbol);
    clean = clean.slice(1).trim();
  }

  if (!clean) {
    return undefined;
  }

  if (clean.includes("(")) {
    const methodMatch = /^([\w.]+)\s*\(.*\)\s*(?::\s*([\w<>[\]\s.]+))?/.exec(
      clean,
    );
    if (!methodMatch) {
      return undefined;
    }

    const [, name, returnType] = methodMatch;
    return {
      kind: "method",
      value: {
        name: normalizePropertyName(name),
        rawName: name,
        returnType: returnType?.trim(),
        access,
      },
    };
  }

  const colonIndex = clean.indexOf(":");
  if (colonIndex === -1) {
    return undefined;
  }

  const name = clean.slice(0, colonIndex).trim();
  const rawType = clean.slice(colonIndex + 1).trim();
  const type = stripMemberDecorators(rawType);
  if (!name) {
    return undefined;
  }

  const attribute: UMLAttribute = {
    name: normalizePropertyName(name),
    rawName: name,
    type: type || undefined,
    access,
  };

  if (optional) {
    attribute.optional = true;
  }

  if (Object.keys(annotations).length > 0) {
    attribute.annotations = annotations;
  }

  if (unsupportedTokens.length > 0) {
    attribute.unsupportedAnnotations = unsupportedTokens;
  }

  return {
    kind: "attribute",
    value: attribute,
  };
}

function stripMemberDecorators(value: string): string {
  let result = value.trim();
  while (result.startsWith("{")) {
    const end = result.indexOf("}");
    if (end === -1) {
      break;
    }
    result = result.slice(end + 1).trim();
  }
  return result;
}

function extractMemberAnnotations(value: string): {
  value: string;
  annotations: UMLAttributeAnnotations;
  optional: boolean;
  unsupportedTokens: string[];
} {
  const annotations: UMLAttributeAnnotations = {};
  let optional = false;
  const unsupportedTokens: string[] = [];
  let remaining = value.trim();

  while (true) {
    const trailingMatch = remaining.match(/\{([^{}]+)\}\s*$/);
    if (!trailingMatch) {
      break;
    }

    const token = trailingMatch[1].trim();
    const parsed = parseAnnotationToken(token);

    if (parsed.optional) {
      optional = true;
    }

    Object.assign(annotations, parsed.annotations);
    if (parsed.unsupported) {
      unsupportedTokens.push(parsed.unsupported);
    }
    remaining = remaining.slice(0, trailingMatch.index).trimEnd();
  }

  remaining = stripMemberDecorators(remaining);

  return {
    value: remaining.trim(),
    annotations,
    optional,
    unsupportedTokens,
  };
}

function parseAnnotationToken(token: string): {
  annotations: UMLAttributeAnnotations;
  optional: boolean;
  unsupported?: string;
} {
  if (!token) {
    return { annotations: {}, optional: false };
  }

  if (/^o$/i.test(token) || /^optional$/i.test(token)) {
    return { annotations: {}, optional: true };
  }

  if (/^nullable$/i.test(token)) {
    return { annotations: { nullable: true }, optional: false };
  }

  if (/^deprecated$/i.test(token)) {
    return { annotations: { deprecated: true }, optional: false };
  }

  if (/^readonly$/i.test(token)) {
    return { annotations: { readOnly: true }, optional: false };
  }

  if (/^writeonly$/i.test(token)) {
    return { annotations: { writeOnly: true }, optional: false };
  }

  const separatorIndex = findAnnotationSeparator(token);
  if (separatorIndex === -1) {
    return { annotations: {}, optional: false, unsupported: token };
  }

  const key = token.slice(0, separatorIndex).trim().toLowerCase();
  const rawValue = token.slice(separatorIndex + 1).trim();
  const value = stripQuotedValue(rawValue);

  switch (key) {
    case "description":
      return value
        ? { annotations: { description: value }, optional: false }
        : { annotations: {}, optional: false };
    case "example": {
      const parsedValue = parseExampleValue(value);
      return parsedValue !== undefined
        ? { annotations: { example: parsedValue }, optional: false }
        : { annotations: {}, optional: false };
    }
    case "pattern":
      return value
        ? { annotations: { pattern: value }, optional: false }
        : { annotations: {}, optional: false };
    case "minimum": {
      const minimum = Number(value);
      return Number.isFinite(minimum)
        ? { annotations: { minimum }, optional: false }
        : { annotations: {}, optional: false };
    }
    case "maximum": {
      const maximum = Number(value);
      return Number.isFinite(maximum)
        ? { annotations: { maximum }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    case "default": {
      const parsedValue = parseExampleValue(value);
      return parsedValue !== undefined
        ? { annotations: { default: parsedValue }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    case "minlength": {
      const minLength = Number(value);
      return Number.isFinite(minLength)
        ? { annotations: { minLength }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    case "maxlength": {
      const maxLength = Number(value);
      return Number.isFinite(maxLength)
        ? { annotations: { maxLength }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    case "minitems": {
      const minItems = Number(value);
      return Number.isFinite(minItems)
        ? { annotations: { minItems }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    case "maxitems": {
      const maxItems = Number(value);
      return Number.isFinite(maxItems)
        ? { annotations: { maxItems }, optional: false }
        : { annotations: {}, optional: false, unsupported: token };
    }
    default:
      return { annotations: {}, optional: false, unsupported: token };
  }
}

function findAnnotationSeparator(token: string): number {
  const colonIndex = token.indexOf(":");
  const equalsIndex = token.indexOf("=");

  if (colonIndex === -1) {
    return equalsIndex;
  }

  if (equalsIndex === -1) {
    return colonIndex;
  }

  return Math.min(colonIndex, equalsIndex);
}

function stripQuotedValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseExampleValue(
  value: string,
): UMLAttributeAnnotations["example"] | undefined {
  if (!value) {
    return undefined;
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === "true";
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && /^-?\d+(\.\d+)?$/.test(value)) {
    return numericValue;
  }

  return value;
}

/**
 * Parses enums declared in the UML diagram.
 */
function parseEnumDeclarations(umlText: string): UMLEnum[] {
  const enums: UMLEnum[] = [];
  const enumPattern = /enum\b/g;
  let match: RegExpExecArray | null;

  while ((match = enumPattern.exec(umlText)) !== null) {
    const block = extractNamedBlock(umlText, enumPattern.lastIndex);
    if (!block) {
      continue;
    }

    const values = block.body
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    enums.push({ name: block.name, rawName: block.rawName, values });
    enumPattern.lastIndex = block.endIndex + 1;
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

  let relationLabel: string | undefined;
  const colonIndex = rightRaw.indexOf(":");
  if (colonIndex !== -1) {
    relationLabel = cleanRelationLabel(rightRaw.slice(colonIndex + 1));
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
    rawFrom: fromParsed.rawName,
    to: toParsed.name,
    rawTo: toParsed.rawName,
    type: mapRelation(symbol),
    fromCardinality,
    toCardinality,
    cardinality: toCardinality,
    label: relationLabel,
    rawLabel: relationLabel,
  };
}

/**
 * Finds the first relation symbol in a line, ignoring quoted text.
 */
function findRelationSymbol(
  line: string,
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
            line.charAt(index + symbol.length),
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

function isCardinalityValue(token: string): boolean {
  if (!token) {
    return false;
  }

  if (token === "*") {
    return true;
  }

  if (/^\d+$/.test(token)) {
    return true;
  }

  if (token.toLowerCase() === "many") {
    return true;
  }

  return /^(\d+|\*)\.\.(\d+|\*)$/.test(token);
}

/**
 * Parses the endpoints of a relation and extracts cardinality notes.
 */
function parseRelationEndpoint(
  segment: string,
): { name: string; rawName: string; cardinalityRaw?: string } | undefined {
  const tokens =
    segment
      .match(/"[^"]+"|\S+/g)
      ?.map((token) => token.trim())
      .filter((token) => token.length > 0) ?? [];

  if (!tokens.length) {
    return undefined;
  }

  let name: string | undefined;
  let cardinality: string | undefined;

  for (const token of tokens) {
    const value =
      token.startsWith('"') && token.endsWith('"')
        ? token.slice(1, -1).trim()
        : token;

    if (isCardinalityValue(value)) {
      if (!cardinality) {
        cardinality = value;
      }
      continue;
    }

    if (!name) {
      name = value;
    }
  }

  if (!name) {
    return undefined;
  }

  return {
    name: normalizeComponentName(name),
    rawName: name,
    cardinalityRaw: cardinality,
  };
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

type NamedBlock = {
  name: string;
  rawName: string;
  body: string;
  endIndex: number;
  stereotypes: string[];
};

function extractNamedBlock(
  text: string,
  startIndex: number,
): NamedBlock | null {
  const { name, index } = readEntityName(text, startIndex);
  if (!name) {
    return null;
  }

  const { stereotypes, index: afterStereotypes } = readStereotypes(text, index);
  const openIndex = findNextBodyStart(text, afterStereotypes);
  if (openIndex === -1) {
    return null;
  }

  const closeIndex = findMatchingBraceIndex(text, openIndex);
  if (closeIndex === -1) {
    return null;
  }

  return {
    name: normalizeComponentName(name),
    rawName: name,
    body: text.slice(openIndex + 1, closeIndex),
    endIndex: closeIndex,
    stereotypes,
  };
}

function readEntityName(
  text: string,
  startIndex: number,
): { name?: string; index: number } {
  let index = skipWhitespace(text, startIndex);
  if (index >= text.length) {
    return { index };
  }

  if (text[index] === '"') {
    const closing = findClosingQuote(text, index + 1);
    if (closing === -1) {
      return { index: text.length };
    }
    return { name: text.slice(index + 1, closing), index: closing + 1 };
  }

  const nameStart = index;
  while (index < text.length && !/\s|\{|\(|<|\r|\n/.test(text[index])) {
    index++;
  }

  const rawName = text.slice(nameStart, index).trim();
  return { name: rawName, index };
}

function readStereotypes(
  text: string,
  startIndex: number,
): { stereotypes: string[]; index: number } {
  const stereotypes: string[] = [];
  let index = skipWhitespace(text, startIndex);

  while (text[index] === "<" && text[index + 1] === "<") {
    const closing = text.indexOf(">>", index + 2);
    if (closing === -1) {
      break;
    }
    const value = text.slice(index + 2, closing).trim();
    if (value) {
      stereotypes.push(value);
    }
    index = closing + 2;
    index = skipWhitespace(text, index);
  }

  return { stereotypes, index };
}

function skipWhitespace(text: string, startIndex: number): number {
  let index = startIndex;
  while (index < text.length && /\s/.test(text[index])) {
    index++;
  }
  return index;
}

function findClosingQuote(text: string, startIndex: number): number {
  for (let index = startIndex; index < text.length; index++) {
    if (text[index] === '"') {
      return index;
    }
  }
  return -1;
}

function findNextBodyStart(text: string, startIndex: number): number {
  let index = startIndex;
  let insideQuotes = false;
  let stereotypeDepth = 0;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (!insideQuotes && char === "<" && next === "<") {
      stereotypeDepth++;
      index += 2;
      continue;
    }

    if (stereotypeDepth > 0) {
      if (char === ">" && next === ">") {
        stereotypeDepth--;
        index += 2;
        continue;
      }
      index++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      index++;
      continue;
    }

    if (!insideQuotes && char === "{") {
      return index;
    }

    index++;
  }

  return -1;
}

function findMatchingBraceIndex(text: string, openIndex: number): number {
  let depth = 0;
  let insideQuotes = false;
  let stereotypeDepth = 0;

  for (let index = openIndex; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (!insideQuotes && char === "<" && next === "<") {
      stereotypeDepth++;
      index++;
      continue;
    }

    if (stereotypeDepth > 0) {
      if (char === ">" && next === ">") {
        stereotypeDepth--;
        index++;
        continue;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (insideQuotes) {
      continue;
    }

    if (char === "{") {
      depth++;
      continue;
    }

    if (char === "}") {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function cleanRelationLabel(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.replace(/^:+/, "").trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/^"+|"+$/g, "").trim();
}
