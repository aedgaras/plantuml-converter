import {
  AccessModifier,
  UMLAttribute,
  UMLClassLike,
  UMLClassType,
  UMLDiagram,
  UMLEnum,
  UMLMethod,
  UMLRelation,
} from "./types";

export function transform(umlText: string) {
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
  const relRegex = /(\w+)\s*([<>|o*]*[-.]+[<>|o*]*)\s*("?[\w.*]+"?)?\s*(\w+)/g;
  let relMatch;
  while ((relMatch = relRegex.exec(umlText)) !== null) {
    const [, from, symbol, cardinalityRaw, to] = relMatch;
    const cardinality = cardinalityRaw?.replace(/"/g, "") || undefined;
    relations.push({
      from,
      to,
      type: mapRelation(symbol),
      cardinality,
    });
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
  return JSON.stringify(diagram, null, 2);
}

function parseAccessModifier(symbol: string): AccessModifier {
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

function mapRelation(symbol: string): UMLRelation["type"] {
  if (symbol.includes("<|--") || symbol.includes("--|>")) return "inheritance";
  if (symbol.includes("*--") || symbol.includes("--*")) return "composition";
  if (symbol.includes("o--") || symbol.includes("--o")) return "aggregation";
  if (symbol.includes("<..") || symbol.includes("..>")) return "dependency";
  if (symbol.includes("--") || symbol.includes("..")) return "association";
  return "unknown";
}
