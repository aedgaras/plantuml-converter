import type {
  UMLAttribute,
  UMLClassLike,
  UMLDiagram,
  UMLEnum,
  UMLMethod,
  UMLRelation,
} from "../plant-uml/plant-uml-types";
import {
  normalizeComponentName,
  normalizeEnumValue,
  normalizePropertyName,
} from "./naming-rules";

export type DiagramRule = (diagram: UMLDiagram) => UMLDiagram;

export function applyDiagramRules(
  diagram: UMLDiagram,
  rules: DiagramRule[] = defaultDiagramRules,
): UMLDiagram {
  return rules.reduce((current, rule) => rule(current), diagram);
}

export const defaultDiagramRules: DiagramRule[] = [normalizeDiagramNames];

function normalizeDiagramNames(diagram: UMLDiagram): UMLDiagram {
  return {
    ...diagram,
    classes: diagram.classes?.map(normalizeClassLike),
    interfaces: diagram.interfaces?.map(normalizeClassLike),
    enums: diagram.enums?.map(normalizeEnum),
    relations: diagram.relations?.map(normalizeRelation),
  };
}

function normalizeClassLike(entity: UMLClassLike): UMLClassLike {
  return {
    ...entity,
    rawName: entity.rawName ?? entity.name,
    name: normalizeComponentName(entity.rawName ?? entity.name),
    attributes: entity.attributes.map(normalizeAttribute),
    methods: entity.methods.map(normalizeMethod),
  };
}

function normalizeAttribute(attribute: UMLAttribute): UMLAttribute {
  return {
    ...attribute,
    rawName: attribute.rawName ?? attribute.name,
    name: normalizePropertyName(attribute.rawName ?? attribute.name),
  };
}

function normalizeMethod(method: UMLMethod): UMLMethod {
  return {
    ...method,
    rawName: method.rawName ?? method.name,
    name: normalizePropertyName(method.rawName ?? method.name),
  };
}

function normalizeEnum(item: UMLEnum): UMLEnum {
  return {
    ...item,
    rawName: item.rawName ?? item.name,
    name: normalizeComponentName(item.rawName ?? item.name),
    values: item.values.map(normalizeEnumValue),
  };
}

function normalizeRelation(relation: UMLRelation): UMLRelation {
  return {
    ...relation,
    rawFrom: relation.rawFrom ?? relation.from,
    rawTo: relation.rawTo ?? relation.to,
    rawLabel: relation.rawLabel ?? relation.label,
    from: normalizeComponentName(relation.rawFrom ?? relation.from),
    to: normalizeComponentName(relation.rawTo ?? relation.to),
    label: relation.rawLabel
      ? normalizePropertyName(relation.rawLabel)
      : relation.label
        ? normalizePropertyName(relation.label)
        : undefined,
  };
}
