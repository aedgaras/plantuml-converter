import { describe, expect, it } from "vitest";

import {
  mapRelation,
  parseAccessModifier,
  transformPlantUML,
} from "./plant-uml-transformator";
import type { UMLCardinality, UMLDiagram } from "./plant-uml-types";

const parseUml = (lines: string[]) =>
  JSON.parse(
    JSON.stringify(transformPlantUML(lines.join("\n")), null, 2),
  ) as UMLDiagram;

const getClass = (diagram: UMLDiagram, name: string) =>
  diagram.classes?.find((item) => item.name === name);

const getInterface = (diagram: UMLDiagram, name: string) =>
  diagram.interfaces?.find((item) => item.name === name);

const getEnum = (diagram: UMLDiagram, name: string) =>
  diagram.enums?.find((item) => item.name === name);

const getRelation = (diagram: UMLDiagram, from: string, to: string) =>
  diagram.relations?.find((rel) => rel.from === from && rel.to === to);

const expectCardinality = (
  cardinality: UMLCardinality | undefined,
  expected: Record<string, unknown>,
) => {
  expect(cardinality).toMatchObject(expected);
};

describe("utilities", () => {
  describe("parse, map access modifier", () => {
    it("maps `+` to `public` access modifiers", () => {
      expect(parseAccessModifier("+")).toBe("public");
    });

    it("maps `-` to `private` access modifiers", () => {
      expect(parseAccessModifier("-")).toBe("private");
    });

    it("maps `#` to `protected` access modifiers", () => {
      expect(parseAccessModifier("#")).toBe("protected");
    });

    it("maps `~` to `package` access modifiers", () => {
      expect(parseAccessModifier("~")).toBe("package");
    });

    it("falls back to `public` when symbol is unrecognised", () => {
      expect(parseAccessModifier("?")).toBe("public");
    });
  });

  describe("parse, map relation", () => {
    it("maps `<|--`, `--|>` to `inheritance` relation types", () => {
      expect(mapRelation("<|--")).toBe("inheritance");
      expect(mapRelation("--|>")).toBe("inheritance");
    });

    it("maps `*--` to `composition` relation type", () => {
      expect(mapRelation("*--")).toBe("composition");
    });

    it("maps `o--` to `aggregation` relation type", () => {
      expect(mapRelation("o--")).toBe("aggregation");
    });
    it("maps `<..` to `dependency` relation types", () => {
      expect(mapRelation("<..")).toBe("dependency");
    });
    it("maps `--` to `association` relation types", () => {
      expect(mapRelation("--")).toBe("association");
    });

    it("returns `unknown` when no pattern matches", () => {
      expect(mapRelation("??")).toBe("unknown");
    });
  });
});

describe("transformator", () => {
  describe("type declarations", () => {
    it("parses classes", () => {
      const diagram = parseUml(["class Person {}"]);

      expect(getClass(diagram, "Person")).toMatchObject({
        name: "Person",
        type: "class",
      });
    });

    it("parses interfaces", () => {
      const diagram = parseUml([
        "interface Speakable {",
        "  +speak(): void",
        "}",
      ]);

      expect(getInterface(diagram, "Speakable")).toMatchObject({
        name: "Speakable",
        type: "interface",
      });
    });

    it("parses enums", () => {
      const diagram = parseUml(["enum Gender {", "  MALE", "  FEMALE", "}"]);

      expect(getEnum(diagram, "Gender")).toMatchObject({
        name: "Gender",
        values: ["MALE", "FEMALE"],
      });
    });
  });

  describe("class members", () => {
    it("parses class attributes", () => {
      const diagram = parseUml(["class Employee {", "  +id: Int", "}"]);

      const employee = getClass(diagram, "Employee");
      expect(employee).toBeTruthy();
      expect(employee?.attributes).toEqual([
        { name: "id", rawName: "id", type: "Int", access: "public" },
      ]);
    });

    it("parses class methods", () => {
      const diagram = parseUml([
        "class Employee {",
        "  +hire(startDate: Date): void",
        "}",
      ]);

      const employee = getClass(diagram, "Employee");
      expect(employee).toBeTruthy();
      expect(employee?.methods).toEqual([
        {
          name: "hire",
          rawName: "hire",
          returnType: "void",
          access: "public",
        },
      ]);
    });

    it("parses `public` access modifier", () => {
      const diagram = parseUml(["class Person {", "  +name: String", "}"]);

      const person = getClass(diagram, "Person");
      expect(person).toBeTruthy();
      expect(person?.attributes).toEqual([
        { name: "name", rawName: "name", type: "String", access: "public" },
      ]);
    });

    it("parses `private` access modifier", () => {
      const diagram = parseUml(["class Person {", "  -ssn: String", "}"]);

      const person = getClass(diagram, "Person");
      expect(person).toBeTruthy();
      expect(person?.attributes).toEqual([
        { name: "ssn", rawName: "ssn", type: "String", access: "private" },
      ]);
    });

    it("parses `protected` access modifier", () => {
      const diagram = parseUml(["class Person {", "  #address: String", "}"]);

      const person = getClass(diagram, "Person");
      expect(person).toBeTruthy();
      expect(person?.attributes).toEqual([
        {
          name: "address",
          rawName: "address",
          type: "String",
          access: "protected",
        },
      ]);
    });

    it("parses `package` access modifier", () => {
      const diagram = parseUml(["class Person {", "  ~metadata: String", "}"]);

      const person = getClass(diagram, "Person");
      expect(person).toBeTruthy();
      expect(person?.attributes).toEqual([
        {
          name: "metadata",
          rawName: "metadata",
          type: "String",
          access: "package",
        },
      ]);
    });
  });

  describe("complex fixtures support", () => {
    it("parses quoted class names with decorators and optional markers", () => {
      const diagram = parseUml([
        'class "PaymentIntent" <<RequestBody>> {',
        "  {field} id : string",
        "  {field} metadata : string -> string {O}",
        "}",
      ]);

      const paymentIntent = getClass(diagram, "PaymentIntent");
      expect(paymentIntent).toBeTruthy();
      expect(paymentIntent?.rawName).toBe("PaymentIntent");
      expect(paymentIntent?.attributes).toEqual([
        { name: "id", rawName: "id", type: "string", access: "public" },
        {
          name: "metadata",
          rawName: "metadata",
          type: "string -> string",
          access: "public",
          optional: true,
        },
      ]);
    });

    it("normalizes class names that include spaces or punctuation", () => {
      const diagram = parseUml([
        'class "getSamlConfiguration default" <<Response>> {}',
        'class "getAuthorizableKeystoreFile 200 application/octet-stream" <<Response>> {}',
      ]);

      expect(getClass(diagram, "getSamlConfigurationDefault")).toBeTruthy();
      expect(getClass(diagram, "getSamlConfigurationDefault")?.rawName).toBe(
        "getSamlConfiguration default",
      );
      expect(
        getClass(
          diagram,
          "getAuthorizableKeystoreFile200ApplicationOctetStream",
        ),
      ).toBeTruthy();
    });

    it("parses relations that use quoted names and cardinalities", () => {
      const diagram = parseUml([
        'class "PaymentIntent" {}',
        'class "PaymentMethod" {}',
        '"PaymentIntent" --> "0..1" "PaymentMethod" : "default_payment_method"',
      ]);

      const relation = getRelation(diagram, "PaymentIntent", "PaymentMethod");
      expect(relation).toMatchObject({
        type: "association",
        label: "default_payment_method",
        rawLabel: "default_payment_method",
        toCardinality: { type: "range", min: 0, max: 1 },
      });
    });

    it("parses supported field annotations into attribute metadata", () => {
      const diagram = parseUml([
        'class "Customer" {',
        '  +email: string {description: "Primary contact email"} {pattern=^[^@]+@[^@]+$} {example: "user@example.com"}',
        "  +age: int {minimum: 18} {maximum: 120} {default: 21}",
        "  +nickname: string {nullable} {optional} {deprecated}",
        "  +aliases: string[] {readOnly} {minItems: 1} {maxItems: 10}",
        "  +password: string {writeOnly} {minLength: 8} {maxLength: 64} {unknownFlag}",
        "}",
      ]);

      const customer = getClass(diagram, "Customer");
      expect(customer?.attributes).toEqual([
        {
          name: "email",
          rawName: "email",
          type: "string",
          access: "public",
          annotations: {
            description: "Primary contact email",
            pattern: "^[^@]+@[^@]+$",
            example: "user@example.com",
          },
        },
        {
          name: "age",
          rawName: "age",
          type: "int",
          access: "public",
          annotations: {
            minimum: 18,
            maximum: 120,
            default: 21,
          },
        },
        {
          name: "nickname",
          rawName: "nickname",
          type: "string",
          access: "public",
          optional: true,
          annotations: {
            nullable: true,
            deprecated: true,
          },
        },
        {
          name: "aliases",
          rawName: "aliases",
          type: "string[]",
          access: "public",
          annotations: {
            readOnly: true,
            minItems: 1,
            maxItems: 10,
          },
        },
        {
          name: "password",
          rawName: "password",
          type: "string",
          access: "public",
          annotations: {
            writeOnly: true,
            minLength: 8,
            maxLength: 64,
          },
          unsupportedAnnotations: ["unknownFlag"],
        },
      ]);
    });
  });

  describe("relations", () => {
    it("parses `inheritance` relation", () => {
      const diagram = parseUml([
        "class Person {}",
        "class Student {}",
        "Person <|-- Student",
      ]);

      const relation = getRelation(diagram, "Person", "Student");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("inheritance");
      expect(relation?.cardinality).toEqual(undefined);
    });

    it("parses `inheritance`, different relation", () => {
      const diagram = parseUml([
        "class Person {}",
        "class Student {}",
        "Person --|> Student",
      ]);

      const relation = getRelation(diagram, "Person", "Student");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("inheritance");
      expect(relation?.cardinality).toEqual(undefined);
    });

    it("parses `composition` relations", () => {
      const diagram = parseUml([
        "class Person {}",
        "class Address {}",
        "Person *-- Address",
      ]);

      const relation = getRelation(diagram, "Person", "Address");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("composition");
    });

    it("parses `association` relations", () => {
      const diagram = parseUml([
        "class Person {}",
        "enum Gender {",
        "  MALE",
        "  FEMALE",
        "}",
        "Person --> Gender",
      ]);

      const relation = getRelation(diagram, "Person", "Gender");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("association");
    });

    it("parses relations that include directional arrowheads on compositions", () => {
      const diagram = parseUml([
        'class "InstallStatus" {}',
        'class "InstallStatus.status" {}',
        '"InstallStatus" *--> "0..1" "InstallStatus.status" : "status"',
      ]);

      const relation = getRelation(diagram, "InstallStatus", "InstallStatusStatus");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("composition");
      expectCardinality(relation?.toCardinality, {
        type: "range",
        raw: "0..1",
        min: 0,
        max: 1,
      });
    });

    it("parses `implementation` relations", () => {
      const diagram = parseUml([
        "class Person {}",
        "interface Speakable {",
        "  +speak(): void",
        "}",
        "Person ..|> Speakable",
      ]);

      const relation = getRelation(diagram, "Person", "Speakable");
      expect(relation).toBeTruthy();
      expect(relation?.type).toBe("dependency");
      expect(relation?.fromCardinality).toBeUndefined();
      expect(relation?.toCardinality).toBeUndefined();
    });

    describe("cardinality", () => {
      it("parses `inheritance` relation with cardinality", () => {
        const diagram = parseUml([
          "class Person {}",
          "class Student {}",
          'Person "1..1" <|-- "1..1" Student',
        ]);

        const relation = getRelation(diagram, "Person", "Student");
        expect(relation).toBeTruthy();
        expect(relation?.type).toBe("inheritance");
        expectCardinality(relation?.fromCardinality, {
          type: "range",
          raw: "1..1",
          min: 1,
          max: 1,
        });
        expectCardinality(relation?.toCardinality, {
          type: "range",
          raw: "1..1",
          min: 1,
          max: 1,
        });
        expect(relation?.cardinality).toEqual(relation?.toCardinality);
      });

      it("parses `composition` relations with cardinality", () => {
        const diagram = parseUml([
          "class Person {}",
          "class Address {}",
          'Person "1" *-- "1..*" Address',
        ]);

        const relation = getRelation(diagram, "Person", "Address");
        expect(relation).toBeTruthy();
        expect(relation?.type).toBe("composition");
        expectCardinality(relation?.fromCardinality, {
          type: "exact",
          raw: "1",
          value: 1,
        });
        expectCardinality(relation?.toCardinality, {
          type: "range",
          raw: "1..*",
          min: 1,
        });
      });

      it("parses `association` relations with cardinality", () => {
        const diagram = parseUml([
          "class Person {}",
          "enum Gender {",
          "  MALE",
          "  FEMALE",
          "}",
          'Person "1..1" --> "1..1" Gender',
        ]);

        const relation = getRelation(diagram, "Person", "Gender");
        expect(relation).toBeTruthy();
        expect(relation?.type).toBe("association");
        expectCardinality(relation?.fromCardinality, {
          type: "range",
          raw: "1..1",
          min: 1,
          max: 1,
        });
        expectCardinality(relation?.toCardinality, {
          type: "range",
          raw: "1..1",
          min: 1,
          max: 1,
        });
      });

      it("parses diverse cardinality formats", () => {
        const diagram = parseUml([
          "class Order {}",
          "class LineItem {}",
          "class Customer {}",
          'Order "*" -- "0..*" LineItem',
          'Customer "many" -- "1" Order',
        ]);

        const orderToLineItem = getRelation(diagram, "Order", "LineItem");
        expect(orderToLineItem).toBeTruthy();
        expectCardinality(orderToLineItem?.fromCardinality, {
          type: "many",
          raw: "*",
        });
        expectCardinality(orderToLineItem?.toCardinality, {
          type: "range",
          raw: "0..*",
          min: 0,
        });

        const customerToOrder = getRelation(diagram, "Customer", "Order");
        expect(customerToOrder).toBeTruthy();
        expectCardinality(customerToOrder?.fromCardinality, {
          type: "custom",
          raw: "many",
          label: "many",
        });
        expectCardinality(customerToOrder?.toCardinality, {
          type: "exact",
          raw: "1",
          value: 1,
        });
      });
    });
  });
});
