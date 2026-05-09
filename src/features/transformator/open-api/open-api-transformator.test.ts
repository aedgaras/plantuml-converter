import { describe, expect, it } from "vitest";

import { transformPlantUML } from "../plant-uml/plant-uml-transformator";
import {
  transformToOpenApi,
  transformToOpenApiResult,
} from "./open-api-transformator";
import type { OpenApiDocument } from "./open-api-types";
import fs from "node:fs";
import path from "node:path";

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
    const personsPath = doc.paths["/persons"] as any;
    const schemas = doc.components.schemas;

    expect(personsPath).toMatchObject({
      summary: "Person collection",
      get: {
        summary: "List Persons",
        responses: {
          "200": {
            description: "List of Persons",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Person" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Person",
        responses: {
          "201": {
            description: "Person created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Person" },
              },
            },
          },
          "400": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    });

    const personItemPath = doc.paths["/persons/{id}"] as any;
    expect(personItemPath).toMatchObject({
      summary: "Person item",
      get: {
        summary: "Get Person",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
          },
        ],
        responses: {
          "200": {
            description: "Person details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Person" },
              },
            },
          },
          "404": {
            description: "Person not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Delete Person",
        responses: {
          "204": {
            description: "Person deleted",
          },
          "404": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    });

    expect(schemas.ApiError).toMatchObject({
      type: "object",
      properties: {
        message: { type: "string" },
      },
    });

    expect(schemas.Gender).toEqual({
      type: "string",
      enum: ["MALE", "FEMALE"],
      "x-source": {
        kind: "enum",
        name: "Gender",
      },
    });

    expect(schemas.Speakable).toEqual({
      type: "object",
      "x-methods": [
        {
          name: "speak",
          access: "public",
          returnType: "void",
        },
      ],
      "x-source": {
        kind: "class",
        name: "Speakable",
      },
    });

    expect(schemas.Person).toMatchObject({
      type: "object",
      "x-methods": [
        {
          name: "greet",
          access: "public",
          returnType: "void",
        },
      ],
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
      new Set(["id", "name", "birthDate", "isActive", "address", "gender"]),
    );

    expect(schemas.Address).toEqual({
      type: "object",
      properties: {
        street: {
          type: "string",
          "x-source": {
            kind: "attribute",
            name: "Address",
            member: "street",
          },
        },
      },
      required: ["street"],
      "x-source": {
        kind: "class",
        name: "Address",
      },
    });

    expect(schemas.Employee).toEqual({
      allOf: [
        { $ref: "#/components/schemas/Person" },
        {
          type: "object",
          properties: {
            salary: {
              type: "number",
              "x-source": {
                kind: "attribute",
                name: "Employee",
                member: "salary",
              },
            },
          },
          required: ["salary"],
          "x-source": {
            kind: "class",
            name: "Employee",
          },
        },
      ],
    });
  });

  it("uses relation labels as property names to avoid collisions", () => {
    const doc = toOpenApi([
      "class Order {",
      "  +id: string",
      "}",
      "",
      "class Customer {",
      "  +id: string",
      "}",
      "",
      "class PaymentMethod {",
      "  +id: string",
      "}",
      "",
      'Order --> "1" Customer : buyer',
      'Order --> "0..*" Customer : "seller accounts"',
      'Customer --> "0..1" PaymentMethod : default_payment_method',
    ]);

    const orderSchema = doc.components.schemas.Order as any;
    expect(orderSchema.properties.buyer).toMatchObject({
      $ref: "#/components/schemas/Customer",
      "x-source": {
        kind: "relation",
        name: "Order",
        member: "buyer",
      },
    });
    expect(orderSchema.required).toContain("buyer");
    expect(orderSchema.properties.seller_accounts).toMatchObject({
      type: "array",
      items: { $ref: "#/components/schemas/Customer" },
      "x-source": {
        kind: "relation",
        name: "Order",
        member: "seller_accounts",
      },
    });
    expect(orderSchema.required ?? []).not.toContain("seller_accounts");

    const customerSchema = doc.components.schemas.Customer as any;
    expect(customerSchema.properties.default_payment_method).toMatchObject({
      $ref: "#/components/schemas/PaymentMethod",
      "x-source": {
        kind: "relation",
        name: "Customer",
        member: "default_payment_method",
      },
    });
  });

  it("keeps relations when composition symbols include directional arrowheads", () => {
    const doc = toOpenApi([
      'class "InstallStatus" {',
      "  +id: string",
      "}",
      'class "InstallStatus.status" {',
      "  +finished: boolean",
      "}",
      '"InstallStatus" *--> "0..1" "InstallStatus.status" : status',
    ]);

    const installStatus = doc.components.schemas.InstallStatus as any;
    expect(installStatus.properties.status).toMatchObject({
      $ref: "#/components/schemas/InstallStatusStatus",
      "x-source": {
        kind: "relation",
        name: "InstallStatus",
        member: "status",
      },
    });
    expect(installStatus.required ?? []).not.toContain("status");
  });

  it("treats domain classes referenced by Path stereotypes as responses", () => {
    const doc = toOpenApi([
      'class "InstallStatus" {',
      "  +id: string",
      "}",
      'class "getInstallStatus default" <<Response>> {',
      "  +value: string",
      "}",
      'class "getInstallStatus" <<Path>> <<GET /crx/packmgr/installstatus.jsp>> {}',
      '"getInstallStatus" ..> "1" "InstallStatus" : 200',
      '"getInstallStatus" ..> "1" "getInstallStatus default" : default',
    ]);

    const responses =
      doc.paths["/crx/packmgr/installstatus.jsp"]?.get?.responses;
    expect(responses?.["200"]).toBeDefined();
    expect(
      responses?.["200"]?.content?.["application/json"]?.schema,
    ).toEqual({ $ref: "#/components/schemas/InstallStatus" });
    expect(responses?.default?.content?.["application/json"]?.schema).toEqual({
      $ref: "#/components/schemas/getInstallStatusDefault",
    });
  });

  it("builds explicit paths for the Adobe Experience Manager fixture", () => {
    const fixture = fs.readFileSync(
      path.join(
        __dirname,
        "../../../lib/puml/adobe-experience-manager.puml",
      ),
      "utf8",
    );
    const doc = transformToOpenApi(transformPlantUML(fixture));

    const expectedRoutes = [
      "/crx/packmgr/installstatus.jsp",
      "/libs/granite/security/truststore.json",
      "/system/console/bundles/{name}.json",
      "/system/console/configMgr/com.adobe.granite.auth.saml.SamlAuthenticationHandler",
      "/authorizables/{authorizableId}/keystore",
      "/authorizables/{authorizableId}/keystore/file",
    ];

    for (const route of expectedRoutes) {
      expect(doc.paths[route]).toBeDefined();
    }

    expect(doc.paths["/crx/packmgr/installstatus.jsp"]?.get).toBeDefined();
    expect(doc.paths["/libs/granite/security/truststore.json"]?.get).toBeDefined();
    expect(doc.paths["/system/console/bundles/{name}.json"]?.get).toBeDefined();
    const samlPath =
      doc.paths[
        "/system/console/configMgr/com.adobe.granite.auth.saml.SamlAuthenticationHandler"
      ];
    expect(samlPath?.get).toBeDefined();
    expect(samlPath?.post).toBeDefined();
    const keystorePath = doc.paths["/authorizables/{authorizableId}/keystore"];
    expect(keystorePath?.get).toBeDefined();
    expect(keystorePath?.post).toBeDefined();
    expect(
      doc.paths["/authorizables/{authorizableId}/keystore/file"]?.get,
    ).toBeDefined();
    const installStatusResponse =
      doc.paths["/crx/packmgr/installstatus.jsp"]?.get?.responses?.["200"];
    expect(
      installStatusResponse?.content?.["application/json"]?.schema,
    ).toEqual({ $ref: "#/components/schemas/InstallStatus" });
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

    const orderCollectionPath = doc.paths["/orders"] as any;
    expect(orderCollectionPath.post.responses["201"].content).toBeDefined();
    expect(orderCollectionPath.post.responses["400"].content).toBeDefined();

    const orderItemPath = doc.paths["/orders/{id}"] as any;
    expect(orderItemPath.put.responses["404"].content).toBeDefined();
    expect(orderItemPath.delete.responses["404"].content).toBeDefined();
  });

  it("builds HTTP operations only from explicit Path stereotypes", () => {
    const doc = toOpenApi([
      "class Order {",
      "  +id: UUID",
      "  +total: number",
      "}",
      "",
      'class "CreateOrderBody" <<RequestBody>> {',
      "}",
      '"CreateOrderBody" --> "1" Order',
      "",
      'class "OrderResponse" <<Response>> {',
      "}",
      '"OrderResponse" --> "1" Order',
      "",
      'class "createOrder" <<Path>> <<POST /orders>> {',
      "}",
      '"createOrder" --> "1" "CreateOrderBody"',
      '"createOrder" ..> "1" "OrderResponse" : \"201\"',
      "",
      'class "getOrder" <<Path>> <<GET /orders/{orderId}>> {',
      "}",
      '"getOrder" ..> "1" "OrderResponse" : \"200\"',
    ]);

    const createPath = doc.paths["/orders"] as any;
    expect(createPath.get).toBeUndefined();
    expect(createPath.post).toBeDefined();
    expect(
      createPath.post.requestBody.content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateOrderBody" });
    expect(createPath.post.responses["201"].content).toBeDefined();
    expect(createPath.post.responses["default"]).toBeDefined();

    const detailPath = doc.paths["/orders/{orderId}"] as any;
    expect(detailPath.get).toBeDefined();
    expect(detailPath.post).toBeUndefined();
    expect(detailPath.get.parameters).toEqual([
      {
        name: "orderId",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Order Id path parameter",
        "x-source": {
          kind: "parameter",
          name: "orderId",
        },
      },
    ]);
    expect(detailPath.get.responses["200"].content).toBeDefined();
  });

  it("maps supported field annotations into OpenAPI schema constraints", () => {
    const doc = toOpenApi([
      "class Customer {",
      '  +email: string {description: "Primary contact email"} {pattern=^[^@]+@[^@]+$} {example: "user@example.com"}',
      "  +age: int {minimum: 18} {maximum: 120}",
      "  +nickname: string {nullable} {optional}",
      "}",
    ]);

    expect(doc.components.schemas.Customer).toMatchObject({
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Primary contact email",
          pattern: "^[^@]+@[^@]+$",
          example: "user@example.com",
          "x-source": {
            kind: "attribute",
            name: "Customer",
            member: "email",
          },
        },
        age: {
          type: "integer",
          format: "int32",
          minimum: 18,
          maximum: 120,
          "x-source": {
            kind: "attribute",
            name: "Customer",
            member: "age",
          },
        },
        nickname: {
          type: "string",
          nullable: true,
          "x-source": {
            kind: "attribute",
            name: "Customer",
            member: "nickname",
          },
        },
      },
      "x-source": {
        kind: "class",
        name: "Customer",
      },
    });
    expect((doc.components.schemas.Customer as any).required).toEqual([
      "age",
      "email",
    ]);
  });

  it("builds explicit query and path parameters from Parameter stereotypes", () => {
    const doc = toOpenApi([
      'class "ListOrdersPage" <<Parameter query page>> {',
      "  +value: int {minimum: 1} {description: \"Page number\"}",
      "}",
      'class "OrderIdParam" <<Parameter path orderId>> {',
      "  +value: uuid {description: \"Order identifier\"}",
      "}",
      'class "OrderResponse" <<Response>> {}',
      'class "listOrders" <<Path>> <<GET /orders/{orderId}>> {}',
      '"listOrders" --> "0..1" "ListOrdersPage"',
      '"listOrders" --> "1" "OrderIdParam"',
      '"listOrders" ..> "1" "OrderResponse" : "200"',
    ]);

    expect(doc.paths["/orders/{orderId}"]?.get?.parameters).toEqual([
      {
        name: "orderId",
        in: "path",
        required: true,
        schema: {
          type: "string",
          format: "uuid",
          description: "Order identifier",
        },
        description: "Order identifier",
        "x-source": {
          kind: "parameter",
          name: "OrderIdParam",
        },
      },
      {
        name: "page",
        in: "query",
        required: false,
        schema: {
          type: "integer",
          format: "int32",
          minimum: 1,
          description: "Page number",
        },
        description: "Page number",
        "x-source": {
          kind: "parameter",
          name: "ListOrdersPage",
        },
      },
    ]);
  });

  it("returns diagnostics, canonical ordering, and strict mode failures", () => {
    const result = transformToOpenApiResult(
      transformPlantUML(
        [
          'class "Customer" <<Entity>> {',
          '  +aliases: string[] {minItems: 1} {maxItems: 10}',
          '  +status: string {deprecated} {default: "active"} {unsupportedThing}',
          "}",
          'class "Order" {}',
          'class "MissingPath" <<Path>> <<GET /customers/{customerId}>> {}',
          'class "MissingPathDuplicate" <<Path>> <<GET /customers/{customerId}>> {}',
          '"Customer" --> "many" "Order"',
          '"Customer" --> "Ghost"',
        ].join("\n"),
      ),
    );

    expect(result.document.paths).toHaveProperty("/customers/{customerId}");
    expect(result.document.components.schemas.Customer).toMatchObject({
      properties: {
        aliases: {
          type: "array",
          minItems: 1,
          maxItems: 10,
        },
        status: {
          type: "string",
          deprecated: true,
          default: "active",
        },
      },
      required: ["aliases", "status"],
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate-path-operation",
          level: "error",
        }),
        expect.objectContaining({
          code: "unsupported-annotation",
          level: "warning",
        }),
        expect.objectContaining({
          code: "unsupported-stereotype",
          level: "warning",
        }),
        expect.objectContaining({
          code: "custom-cardinality",
          level: "warning",
        }),
        expect.objectContaining({
          code: "unresolved-relation-target",
          level: "warning",
        }),
      ]),
    );

    expect(() =>
      transformToOpenApi(transformPlantUML([
        'class "Customer" <<Entity>> {}',
        'class "MissingPath" <<Path>> <<GET /customers>> {}',
        'class "MissingPathDuplicate" <<Path>> <<GET /customers>> {}',
      ].join("\n")), {
        mode: "strict",
      }),
    ).toThrow(/duplicate-path-operation/);
  });
});
