import { describe, expect, it } from "vitest";

import { transformPlantUML } from "../plant-uml/plant-uml-transformator";
import { transformToOpenApi } from "./open-api-transformator";
import type { OpenApiDocument } from "./open-api-types";

const toOpenApi = (uml: string[]): OpenApiDocument =>
  transformToOpenApi(transformPlantUML(uml.join("\n")));

describe("transformToOpenApi", () => {
  it("builds component schemas for classes, interfaces, enums, and relations", () => {
    const doc = toOpenApi([
      "class Person {",
      "  +id: UUID",
      "  +name: String",
      "  +birthDate: date",
      "  +isActive: boolean",
      "  -internalNote: String",
      "  +greet(): void",
      "}",
      "",
      "class Address {",
      "  +street: String",
      "}",
      "",
      "class Employee {",
      "  +salary: number",
      "}",
      "",
      "interface Speakable {",
      "  +speak(): void",
      "}",
      "",
      "enum Gender {",
      "  MALE",
      "  FEMALE",
      "}",
      "",
      'Person "1" *-- "1..*" Address',
      'Person "1..1" --> "1..1" Gender',
      "Person ..|> Speakable",
      "Person <|-- Employee",
    ]);

    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toMatchObject({
      title: "PlantUML Generated API",
      version: "1.0.0",
    });
    expect(doc.paths).toEqual({});

    const schemas = doc.components.schemas;

    expect(schemas.Gender).toEqual({
      type: "string",
      enum: ["MALE", "FEMALE"],
    });

    expect(schemas.Speakable).toEqual({
      type: "object",
      description: "Metodai: public speak(): void",
    });

    expect(schemas.Person).toMatchObject({
      type: "object",
      description: "Metodai: public greet(): void",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        birthDate: { type: "string", format: "date" },
        isActive: { type: "boolean" },
        internalNote: { type: "string" },
        address: {
          type: "array",
          items: { $ref: "#/components/schemas/Address" },
          minItems: 1,
        },
        gender: { $ref: "#/components/schemas/Gender" },
      },
    });

    expect(new Set((schemas.Person as any).required ?? [])).toEqual(
      new Set(["id", "name", "birthDate", "isActive", "address", "gender"])
    );

    expect(schemas.Address).toEqual({
      type: "object",
      properties: {
        street: { type: "string" },
      },
      required: ["street"],
    });

    expect(schemas.Employee).toEqual({
      allOf: [
        { $ref: "#/components/schemas/Person" },
        {
          type: "object",
          properties: {
            salary: { type: "number" },
          },
          required: ["salary"],
        },
      ],
    });
  });

  it("interprets relation cardinalities into arrays, single refs, and required flags", () => {
    const doc = toOpenApi([
      "class Order {}",
      "class LineItem {}",
      "class Comment {}",
      "class Tag {}",
      "",
      'Order "*" -- "1..*" LineItem',
      'Order "0..1" --> Comment',
      'Order "*" -- "many" Tag',
    ]);

    const schemas = doc.components.schemas;
    const order = schemas.Order as any;

    expect(order).toMatchObject({
      type: "object",
      properties: {
        lineItem: {
          type: "array",
          items: { $ref: "#/components/schemas/LineItem" },
          minItems: 1,
        },
        comment: { $ref: "#/components/schemas/Comment" },
        tag: {
          type: "array",
          items: { $ref: "#/components/schemas/Tag" },
        },
      },
    });

    expect(new Set(order.required ?? [])).toEqual(new Set(["lineItem"]));
    expect(order.required?.includes("tag")).toBe(false);
  });
});
