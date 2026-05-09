function stripQuotes(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "");
}

function splitTokens(value: string): string[] {
  return stripQuotes(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowercase(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function normalizeComponentName(value: string): string {
  const trimmed = stripQuotes(value);
  if (!trimmed) {
    return "";
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  const tokens = splitTokens(trimmed);
  if (!tokens.length) {
    return trimmed.replace(/\s+/g, "");
  }

  const [first, ...rest] = tokens;
  return first + rest.map(capitalize).join("");
}

export function normalizePropertyName(value: string): string {
  const trimmed = stripQuotes(value);
  if (!trimmed) {
    return "";
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }

  const underscored = trimmed.replace(/\s+/g, "_");
  const sanitized = underscored
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!sanitized) {
    return "";
  }

  if (/^\d/.test(sanitized)) {
    return `rel${sanitized}`;
  }

  return sanitized;
}

export function normalizeEnumValue(value: string): string {
  const trimmed = stripQuotes(value);
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function humanizeName(value: string): string {
  return splitTokens(value).map(capitalize).join(" ");
}

const IRREGULAR_PLURALS: Record<string, string> = {
  person: "people",
  child: "children",
  man: "men",
  woman: "women",
  mouse: "mice",
};

const UNCOUNTABLE_NOUNS = new Set(["equipment", "information", "metadata"]);

export function pluralizeResourceName(value: string): string {
  const normalized = normalizePropertyName(value);
  if (!normalized) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return normalized;
  }

  const irregular = IRREGULAR_PLURALS[lower];
  if (irregular) {
    return irregular;
  }

  if (/(s|x|z|ch|sh)$/.test(lower)) {
    return `${normalized}es`;
  }

  if (/[^\Waeiou]y$/i.test(normalized)) {
    return `${normalized.slice(0, -1)}ies`;
  }

  return `${normalized}s`;
}

export function normalizePathSegment(value: string): string {
  const normalized = stripQuotes(value);
  const kebab = normalized
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase();

  if (kebab.endsWith("s")) {
    return kebab;
  }

  if (/(x|z|ch|sh)$/.test(kebab)) {
    return `${kebab}es`;
  }

  if (kebab.endsWith("y") && !/[aeiou]y$/.test(kebab)) {
    return `${kebab.slice(0, -1)}ies`;
  }

  return `${kebab}s`;
}

export function normalizeRoutePath(value: string): string {
  const trimmed = stripQuotes(value);
  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

export function normalizeOperationId(method: string, value: string): string {
  const verb = normalizePropertyName(method.toLowerCase());
  const resource = normalizeComponentName(value);
  return `${verb}${resource}`;
}
