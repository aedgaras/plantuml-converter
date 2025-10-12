export type AccessModifier = "public" | "private" | "protected" | "package";

export type UMLAttribute = {
  name: string;
  type?: string;
  access: AccessModifier;
};

export type UMLMethod = {
  name: string;
  returnType?: string;
  access: AccessModifier;
};

export type UMLClassType = "class" | "interface";

export type UMLClassLike = {
  name: string;
  type: UMLClassType;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
};

export type UMLEnum = {
  name: string;
  values: string[];
};

export type UMLRelation = {
  from: string;
  to: string;
  type:
    | "association"
    | "inheritance"
    | "composition"
    | "aggregation"
    | "dependency"
    | "unknown";
  cardinality?: string;
};

export type UMLDiagram = {
  classes?: UMLClassLike[];
  interfaces?: UMLClassLike[];
  enums?: UMLEnum[];
  relations?: UMLRelation[];
};
