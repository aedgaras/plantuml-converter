# PlantUML -> OpenAPI transformatoriaus formalus aprašas

## Paskirtis

Transformatorius realizuoja deterministinę dviejų etapų grandinę:

`PlantUML tekstas -> UMLDiagram -> OpenApiDocument`

Šiame apraše formalizuojamas antrasis etapas, kurį įgyvendina
[`open-api-transformator.ts`](/Users/edgarasadomavicius/Developer/plantuml-converter/src/features/transformator/open-api/open-api-transformator.ts).
Būtent ši dalis atlieka model-to-model transformaciją iš `UMLDiagram` į
`OpenAPI 3.1.0` dokumentą.

## Transformacijos įėjimas ir išėjimas

### Įėjimo modelis `UMLDiagram`

Transformatorius naudoja keturias kolekcijas:

| Kolekcija | Turinys |
| --- | --- |
| `classes` | UML klasės |
| `interfaces` | UML sąsajos |
| `enums` | UML išvardijimai |
| `relations` | ryšiai tarp elementų |

Naudojami pagrindiniai laukų tipai:

| UML elementas | Reikšmingi laukai |
| --- | --- |
| `UMLClassLike` | `name`, `rawName`, `attributes[]`, `methods[]`, `stereotypes[]` |
| `UMLEnum` | `name`, `rawName`, `values[]` |
| `UMLRelation` | `from`, `to`, `type`, `label`, `toCardinality` |
| `UMLAttribute` | `name`, `type`, `access`, `optional`, `annotations` |

### Išėjimo modelis `OpenApiDocument`

Generuojamas dokumentas su trimis pagrindiniais blokais:

| OpenAPI dalis | Paskirtis |
| --- | --- |
| `info` | bazinė dokumento metainformacija |
| `paths` | operacijos ir jų atsakai |
| `components.schemas` | sugeneruotos schemos |

Papildomai grąžinamas diagnostikų rinkinys. Jei kviečiama su
`options.mode === "strict"` ir aptikta bent viena `error` lygio diagnostika,
transformacija užbaigiama išimtimi.

## Transformacijos proceso diagrama

Proceso diagrama, suderinta su dabartine realizacija:

- [plantuml-transform-activity.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/plantuml-transform-activity.puml)

Diagrama aprašo tikrą `transformToOpenApiResult(...)` seką: normalizavimą,
diagnostiką, schemų konstravimą, `paths` generavimą, validaciją, kanonizavimą
ir `strict` režimo patikrą.

## Transformacijos pipeline

| Žingsnis | Realizacija | Rezultatas |
| --- | --- | --- |
| 1. Normalizavimas | `applyDiagramRules(...)` | suvienodinami vardai ir išsaugomi `raw*` laukai |
| 2. Kolekcijų išskyrimas | `extractDiagramCollections(...)` | gaunamos `classes`, `interfaces`, `enums`, `relations` |
| 3. Ankstyvoji diagnostika | `collectDiagramDiagnostics(...)` | perspėjimai dėl stereotipų ir `custom` kardinalumų |
| 4. Domeno klasių atranka | `!hasStereotype(entity, "Path")` | atskiriamos domeninės klasės nuo endpoint klasių |
| 5. Schemos juodraščių kūrimas | `buildClassSchemas(...)` | atributai ir metodų metaduomenys perkeliami į tarpines schemas |
| 6. Ryšių pritaikymas | `applyRelations(...)` | užfiksuojamas paveldėjimas ir nuorodinės savybės |
| 7. Komponentų schemų surinkimas | `buildComponentSchemas(...)` | gaunamos galutinės `components.schemas` reikšmės |
| 8. Klaidos schemos užtikrinimas | `ensureErrorSchema(...)` | pridedama `ApiError`, jei jos nebuvo |
| 9. Operacijų generavimas | `buildExplicitPaths(...)` arba `buildCrudPaths(...)` | sugeneruojami `paths` |
| 10. Dokumento validacija | `validateOpenApiDocument(...)` | surenkamos validacijos klaidos |
| 11. Kanonizavimas | `canonicalizeDocument(...)` | stabilus rikiavimas |
| 12. Galutinis rezultatas | `canonicalizeDiagnostics(...)` + `strict` patikra | `document` ir `diagnostics` |

## Naudojamų taisyklių rinkinys

### 1. Normalizavimo taisyklės

Šios taisyklės įvykdomos prieš bet kokią OpenAPI generaciją.

| Įėjimo reikšmė | Transformacija | Pastaba |
| --- | --- | --- |
| klasės / sąsajos pavadinimas | `normalizeComponentName(...)` | išsaugomas ir `rawName` |
| atributo pavadinimas | `normalizePropertyName(...)` | išsaugomas ir `rawName` |
| metodo pavadinimas | `normalizePropertyName(...)` | išsaugomas ir `rawName` |
| enum pavadinimas | `normalizeComponentName(...)` | išsaugomas ir `rawName` |
| enum reikšmė | `normalizeEnumValue(...)` | verčiama į `UPPER_CASE` |
| ryšio `from` / `to` | `normalizeComponentName(...)` | išsaugomi `rawFrom`, `rawTo` |
| ryšio `label` | `normalizePropertyName(...)` | išsaugomas `rawLabel` |

### 2. UML elementų transformacija į `components.schemas`

| UML elementas | OpenAPI rezultatas | Realizacijos pastaba |
| --- | --- | --- |
| `class X` | `components.schemas.X` | kuriama `type: object` schema |
| `interface X` | `components.schemas.X` | apdorojama taip pat kaip klasė |
| `enum X` | `components.schemas.X` | kuriama `type: string` su `enum: [...]` |
| klasės / sąsajos metodai | `x-methods` | saugomi kaip plėtinio metaduomenys |
| bet kuri sugeneruota schema | `x-source` | pažymima kilmės informacija |
| paveldinti klasė | `allOf` | schema sudaroma iš tėvinių `$ref` ir nuosavo objekto |

### 3. Atributų tipų transformacija

| UML atributo tipas | OpenAPI schema |
| --- | --- |
| `string`, `text` | `type: string` |
| `uuid` | `type: string`, `format: uuid` |
| `date` | `type: string`, `format: date` |
| `datetime`, `date-time`, `timestamp` | `type: string`, `format: date-time` |
| `boolean`, `bool` | `type: boolean` |
| `int` | `type: integer`, `format: int32` |
| `integer` | `type: integer` |
| `long` | `type: integer`, `format: int64` |
| `float` | `type: number`, `format: float` |
| `double`, `decimal` | `type: number`, `format: double` |
| `number` | `type: number` |
| `email` | `type: string`, `format: email` |
| `T[]` | `type: array`, `items = map(T)` |
| `K -> V` | `type: object`, `additionalProperties = map(V)` |
| žinomas komponento vardas | `$ref: #/components/schemas/<Name>` |
| nežinomas tipas | `type: string` |

### 4. Atributų `required` taisyklės

| UML atributo būsena | OpenAPI rezultatas |
| --- | --- |
| `public` ir ne `optional` | įtraukiamas į `required[]` |
| `private`, `protected`, `package` | neįtraukiamas į `required[]` |
| `optional` | neįtraukiamas į `required[]` |

Svarbu: pati savybė į `properties` įtraukiama nepriklausomai nuo prieigos lygio.
Prieigos lygis veikia tik `required[]`.

### 5. Atributų anotacijų transformacija

| UML anotacija | OpenAPI laukas | Taikymo sąlyga |
| --- | --- | --- |
| `{description: "..."}` | `description` | visiems tipams |
| `{example: ...}` | `example` | visiems tipams |
| `{nullable}` | `nullable: true` | visiems tipams |
| `{pattern: "..."}` | `pattern` | tik `string` |
| `{minimum: n}` | `minimum` | tik `number` / `integer` |
| `{maximum: n}` | `maximum` | tik `number` / `integer` |
| `{default: ...}` | `default` | visiems tipams |
| `{deprecated}` | `deprecated: true` | visiems tipams |
| `{readOnly}` | `readOnly: true` | visiems tipams |
| `{writeOnly}` | `writeOnly: true` | visiems tipams |
| `{minLength: n}` | `minLength` | tik `string` |
| `{maxLength: n}` | `maxLength` | tik `string` |
| `{minItems: n}` | `minItems` | tik `array` |
| `{maxItems: n}` | `maxItems` | tik `array` |
| nepalaikoma anotacija | `warning: unsupported-annotation` | diagnostika, ne schema |

### 6. Ryšių transformacija į schemų savybes

#### 6.1. Ryšio tipo interpretacija

| UML ryšys | OpenAPI interpretacija |
| --- | --- |
| `inheritance` | paveldėjimo ryšys per `allOf` |
| `composition` | nuorodinė savybė su `$ref` arba `array<$ref>` |
| `aggregation` | nuorodinė savybė su `$ref` arba `array<$ref>` |
| `association` | nuorodinė savybė su `$ref` arba `array<$ref>` |
| `dependency` | schemos savybė nekuriama |
| neišspręstas `from` arba `to` | `warning: unresolved-relation-target` |

#### 6.2. Ryšio savybės pavadinimas

| Situacija | Sugeneruotas savybės vardas |
| --- | --- |
| yra `relation.label` | naudojama normalizuota etiketė |
| etiketės nėra | naudojamas `to` vardas su mažąja pradžia |

Pavyzdžiai:

| UML ryšys | OpenAPI savybė |
| --- | --- |
| `Order --> Customer : buyer` | `buyer` |
| `Order --> PaymentMethod` | `paymentMethod` |
| `Order --> Customer : "seller accounts"` | `seller_accounts` |

#### 6.3. Kardinalumo interpretacija

Transformacijoje naudojamas `relation.toCardinality`.

| Kardinalumas | OpenAPI interpretacija |
| --- | --- |
| `1` | vienetinė nuoroda, `required: true` |
| `0..1` | vienetinė nuoroda, neprivaloma |
| `n`, kur `n > 1` | masyvas su `minItems = maxItems = n` |
| `1..*` | masyvas, `minItems: 1`, `required: true` |
| `0..*` | masyvas, neprivalomas |
| `many` | masyvas, neprivalomas |
| `custom` su `one`, `single`, `singular` | vienetinė nuoroda, `required: true` |
| `custom` su `many`, `multiple`, `list`, `collection` | masyvas, neprivalomas |
| kitas `custom` | vienetinė nuoroda, neprivaloma |

Pastaba: pats `custom` kardinalumas vis tiek papildomai registruoja
`warning: custom-cardinality`.

### 7. `paths` generavimo taisyklės

Transformatorius turi du režimus.

#### 7.1. Eksplicitinis režimas per `<<Path>>`

Jei modelyje yra bent viena klasė su stereotipu `<<Path>>`, `paths` generuojami
tik iš tokių klasių. Fallback CRUD režimas tada nebetaikomas.

| UML konstrukcija | OpenAPI rezultatas |
| --- | --- |
| `class X <<Path>> <<GET /orders/{id}>>` | `paths["/orders/{id}"].get` |
| ryšys iš `Path` į `<<RequestBody>>` klasę | `operation.requestBody` |
| ryšys iš `Path` į `<<Response>>` klasę | `operation.responses[status]` |
| ryšys iš `Path` į domeninę klasę / sąsają / enum | `operation.responses[status]` |
| ryšys iš `Path` į `<<Parameter ...>>` klasę | `operation.parameters[]` |

Operacijos laukai pildomi taip:

| Operacijos laukas | Sudarymo taisyklė |
| --- | --- |
| `operationId` | `normalizeOperationId(httpMethod, pathClassName)` |
| `summary` | `"<METHOD> <humanized path class name>"` |
| `tags[0]` | pirmo atsako tipo vardas be `Response` priesagos arba `pathClass.name` |
| `x-source.kind` | `"operation"` |

Jei dvi `<<Path>>` klasės aprašo tą patį `METHOD + route`, registruojama
`error: duplicate-path-operation`.

#### 7.2. Fallback CRUD režimas

Jei `<<Path>>` klasių nėra, kiekvienai domeninei klasei generuojami šie keliai:

| Resurso tipas | Sugeneruoti keliai |
| --- | --- |
| kolekcija | `/<resource-plural>` |
| vienas elementas | `/<resource-plural>/{id}` |

Standartinės operacijos:

| Kelias | HTTP metodas | Sugeneruota paskirtis |
| --- | --- | --- |
| `/<resource-plural>` | `GET` | sąrašo gavimas |
| `/<resource-plural>` | `POST` | kūrimas |
| `/<resource-plural>/{id}` | `GET` | vieno elemento gavimas |
| `/<resource-plural>/{id}` | `PUT` | atnaujinimas |
| `/<resource-plural>/{id}` | `DELETE` | šalinimas |

Papildomai kiekvienas viešas klasės metodas transformuojamas į atskirą veiksmą:

| UML metodas | OpenAPI rezultatas |
| --- | --- |
| `+listReports(): Report[]` | `GET /<resource>/{id}/list-reports` |
| `+updateProfile(): Employee` | `PUT /<resource>/{id}/update-profile` |
| `+patchStatus(): string` | `PATCH /<resource>/{id}/patch-status` |
| `+deleteAvatar(): void` | `DELETE /<resource>/{id}/delete-avatar` |
| kitas viešas metodas | `POST /<resource>/{id}/<action>` |

HTTP metodo inferavimo taisyklės:

| Metodo prefiksas | HTTP metodas |
| --- | --- |
| `get`, `list`, `find`, `search`, `fetch`, `read`, `load`, `retrieve`, `count` | `GET` |
| `put`, `update`, `replace`, `set` | `PUT` |
| `patch`, `modify` | `PATCH` |
| `delete`, `remove`, `destroy` | `DELETE` |
| kita | `POST` |

Sėkmingo statuso taisyklė klasės metodui:

| Sąlyga | Statusas |
| --- | --- |
| `returnType` nenurodytas arba `void` | `204` |
| `POST` su grąžinamu tipu | `201` |
| `DELETE` su grąžinamu tipu | `204` |
| kiti atvejai su grąžinamu tipu | `200` |

### 8. Parametrų transformacija

`Parameter` klasė atpažįstama pagal stereotipą:

`<<Parameter [path|query|header|cookie] [name]>>`

| Taisyklė | Rezultatas |
| --- | --- |
| vieta nenurodyta | naudojama `query` |
| vardas nenurodytas | išvedamas iš klasės vardo |
| yra atributas `value` | schema kuriama iš `value` |
| `value` nėra | schema kuriama iš pirmo atributo |
| `path` parametras | visada `required: true` |
| kitas parametras | `required` nustatomas pagal ryšio kardinalumą |
| atributo `description` | dubliuojamas į `parameter.description` ir `schema.description` |

Jei maršrute yra placeholder'is, bet atskiro `Parameter path ...` aprašo nėra,
sugeneruojamas numatytasis `path` parametras:

| Laukas | Reikšmė |
| --- | --- |
| `name` | placeholder'io vardas |
| `in` | `path` |
| `required` | `true` |
| `schema` | `{ type: "string" }` |
| `description` | `"<Humanized name> path parameter"` |

### 9. `requestBody` ir `responses` taisyklės

#### 9.1. `requestBody`

| UML konstrukcija | OpenAPI rezultatas |
| --- | --- |
| `Path -> RequestBody` ryšys | `requestBody.content.application/json.schema = $ref(RequestBody)` |
| ryšio kardinalumas `1` arba `1..*` | `requestBody.required = true` |
| kitas kardinalumas | `requestBody.required = false` |

#### 9.2. Atsakų statusų parinkimas

| Situacija | Statuso kodas |
| --- | --- |
| ryšio etiketė yra skaičius, pvz. `200` | naudojama kaip statusas |
| ryšio etiketė yra `default` | naudojamas `default` |
| ryšio etiketės nėra ir metodas `POST` | `201` |
| ryšio etiketės nėra ir metodas `DELETE` | `204` |
| ryšio etiketės nėra kitais atvejais | `200` |

#### 9.3. Numatytosios klaidos

| Situacija | OpenAPI rezultatas |
| --- | --- |
| eksplicitinė `Path` operacija | visada užtikrinamas `default` atsakas su `ApiError` |
| fallback `POST` | papildomai generuojamas `400` atsakas su `ApiError` |
| fallback `GET` / `PUT` / `DELETE` item operacijos | generuojamas `404` atsakas su `ApiError` |
| fallback klasės metodo operacija | generuojamas `404` atsakas su `ApiError` |

Jei `ApiError` schema neegzistuoja, ji sukuriama automatiškai:

| Laukas | Reikšmė |
| --- | --- |
| `type` | `object` |
| `properties.message` | `string` |
| `properties.code` | `string` |
| `required` | `["message"]` |

## Diagnostikos ir validavimo taisyklės

### 1. Ankstyvosios diagnostikos

| Kodas | Lygis | Kada registruojama |
| --- | --- | --- |
| `unsupported-stereotype` | `warning` | aptinkamas nenumatytas klasės ar sąsajos stereotipas |
| `custom-cardinality` | `warning` | ryšys turi `toCardinality.type === "custom"` |
| `unsupported-annotation` | `warning` | atributas turi nepalaikomą anotaciją |
| `unresolved-relation-target` | `warning` | ryšio galai neišsprendžiami į žinomas schemas |

### 2. Validacijos po dokumento sugeneravimo

| Kodas | Lygis | Tikrinama sąlyga |
| --- | --- | --- |
| `missing-schema-ref` | `error` | `$ref` rodo į neegzistuojančią schemą |
| `missing-path-parameter` | `error` | route placeholder'is neturi atitinkamo `path` parametro |
| `empty-responses` | `error` | operacija neturi nė vieno atsako |
| `empty-request-body` | `error` | `requestBody` egzistuoja, bet `content` tuščias |
| `inheritance-cycle` | `error` | `allOf` paveldėjimo grafas turi ciklą |
| `duplicate-path-operation` | `error` | tame pačiame route dubliuojamas tas pats HTTP metodas |

## Kanoninė išvesties tvarka

Prieš grąžinant rezultatą vykdomas kanonizavimas:

| Rikiuojama dalis | Taisyklė |
| --- | --- |
| `paths` | pagal kelio pavadinimą |
| `PathItem` metodai | `delete`, `get`, `head`, `options`, `patch`, `post`, `put` |
| `responses` | pagal statuso raktą |
| `components.schemas` | pagal schemos vardą |
| `properties` | pagal savybės vardą |
| `required[]` | abėcėline tvarka |
| diagnostikos | pagal `level:code:message` |

Tai užtikrina deterministinę išvestį ir stabilų testavimą.

## Realizacijos ribos

Dabartinė realizacija sąmoningai netransformuoja arba nenaudoja:

| Nepalaikoma sritis | Pastaba |
| --- | --- |
| `oneOf`, `anyOf` | nėra generavimo logikos |
| `dependency` ryšiai į schemų savybes | ignoruojami kuriant schemas |
| sudėtinga polimorfija | nėra diskriminatorių ar sudėtinių taisyklių |
| semantinis spėjimas iš neišsamių UML modelių | taikomos tik aiškiai užkoduotos taisyklės |

Todėl transformatoriaus paskirtis yra ne laisva interpretacija, o
deterministinis, atsekamas ir testais padengtas UML -> OpenAPI taisyklių
vykdymas.
