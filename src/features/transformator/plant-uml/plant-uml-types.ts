export type AccessModifier = "public" | "private" | "protected" | "package";

export type UMLAttributeAnnotations = {
  description?: string;
  example?: string | number | boolean;
  nullable?: boolean;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
};

export type UMLAttribute = {
  name: string;
  rawName?: string;
  type?: string;
  access: AccessModifier;
  optional?: boolean;
  annotations?: UMLAttributeAnnotations;
  unsupportedAnnotations?: string[];
};

export type UMLMethod = {
  name: string;
  rawName?: string;
  returnType?: string;
  access: AccessModifier;
};

export type UMLClassType = "class" | "interface";

export type UMLClassLike = {
  name: string;
  rawName?: string;
  type: UMLClassType;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  stereotypes?: string[];
};

export type UMLEnum = {
  name: string;
  rawName?: string;
  values: string[];
};

export type UMLCardinalityType = "exact" | "range" | "many" | "custom";

export type UMLCardinality =
  | {
      type: "exact";
      raw: string;
      value: number;
    }
  | {
      type: "range";
      raw: string;
      min?: number;
      max?: number;
    }
  | {
      type: "many";
      raw: string;
    }
  | {
      type: "custom";
      raw: string;
      label: string;
    };

export type UMLRelation = {
  from: string;
  rawFrom?: string;
  to: string;
  rawTo?: string;
  type:
    | "association"
    | "inheritance"
    | "composition"
    | "aggregation"
    | "dependency"
    | "unknown";
  fromCardinality?: UMLCardinality;
  toCardinality?: UMLCardinality;
  cardinality?: UMLCardinality;
  label?: string;
  rawLabel?: string;
};

export type UMLDiagram = {
  classes?: UMLClassLike[];
  interfaces?: UMLClassLike[];
  enums?: UMLEnum[];
  relations?: UMLRelation[];
};
