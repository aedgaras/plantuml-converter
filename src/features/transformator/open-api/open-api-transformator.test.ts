import { describe, expect, it } from "vitest";

import { transformPlantUML } from "../plant-uml/plant-uml-transformator";
import { transformToOpenApi } from "./open-api-transformator";
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
      new Set(["id", "name", "birthDate", "isActive", "address", "gender"]),
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
    expect(orderSchema.properties.buyer).toEqual({
      $ref: "#/components/schemas/Customer",
    });
    expect(orderSchema.required).toContain("buyer");
    expect(orderSchema.properties.seller_accounts).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/Customer" },
    });
    expect(orderSchema.required ?? []).not.toContain("seller_accounts");

    const customerSchema = doc.components.schemas.Customer as any;
    expect(customerSchema.properties.default_payment_method).toEqual({
      $ref: "#/components/schemas/PaymentMethod",
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
    expect(installStatus.properties.status).toEqual({
      $ref: "#/components/schemas/InstallStatusStatus",
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
    expect(detailPath.get.responses["200"].content).toBeDefined();
  });
});
