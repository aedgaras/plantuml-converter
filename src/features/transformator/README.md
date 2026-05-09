# PlantUML Transformatorius

```text
Algoritmas transform(umlText):
  1. Normalizuoti eilutės pabaigas (pakeisti „\r\n“ į „\n“).
  2. Sukurti tuščius sąrašus: klasės, sąsajos, enumeracijos, ryšiai.
  3. Nuskaityti klases ir sąsajas:
       Kiekvienam atitikmeniui / (class|interface) PAVADINIMAS { KŪNAS }/:
         a. Padalink KŪNĄ į apkarpytas, netuščias eilutes.
         b. Kiekvienai eilutei:
              - Nustatyti prieigos modifikatorių iš pirmo simbolio (+, -, #, ~).
              - Pašalinti prieigos simbolį.
              - Jei eilutėje yra „(“:
                   • Traktuoti kaip metodą, ištraukti pavadinimą ir galimą grąžinimo tipą.
                   • Įtraukti { name, returnType, access } į metodų sąrašą.
              - Kitu atveju:
                   • Traktuoti kaip atributą, ištraukti pavadinimą ir tipą.
                   • Įtraukti { name, type, access } į atributų sąrašą.
         c. Sudaryti UMLClassLike objektą su surinktais atributais ir metodais.
         d. Jei tipas „interface“, priskirti sąsajoms, kitaip – klasėms.

  4. Nuskaityti enumeracijos:
       Kiekvienam atitikmeniui /enum PAVADINIMAS { KŪNAS }/:
         a. Padalinti KŪNĄ į apkarpytas, netuščiąs eilutes kaip reikšmes.
         b. Į sąrašą įtraukti { name, values }.

  5. Apdoroti ryšius eilutė po eilutės:
       Kiekvienai UML eilutei:
         a. Praleisti, jei po apkarpymo nebėra jungčių simbolių.
         b. Surasti pirmą ryšio simbolį už kabučių ribų.
         c. Padalinti eilutę į kairinį, simbolį ir dešinį segmentus.
         d. Dešinėje nuimti galimus rolių pavadinimus po „:“.
         e. Kiekvienam segmentui:
              - Suskaidyti į tokenus; kabutėse ar skaičiai – kardinalumas.
              - Likęs pavadinimas laikomas elemento vardu.
         f. Susieti simbolį su ryšio tipu (paveldėjimas, kompozicija, agregacija,
            priklausomybė, asociacija, nežinomas).
         g. Normalizuoti kardinalumus:
              • „*“ -> tipas „many“.
              • Skaičius -> tipas „exact“ su verte.
              • „a..b“ -> tipas „range“ su ribomis (žvaigždutė -> undefined).
              • Kita -> tipas „custom“.
         h. Įtraukti ryšį su from/to vardais, tipu ir struktūrizuotais kardinalumais
            (bei suderinamumo sumetimais dubliuotu `cardinality` lauku).

  6. Sudaryti UMLDiagram objektą iš klasių, sąsajų, išvardinimų ir ryšių.
```

## Laukų anotacijos

Transformatorius taip pat palaiko pasirenkamas atributų anotacijas, kurios gali
būti naudojamos OpenAPI validavimo ir dokumentavimo laukams užpildyti.
Anotacijos rašomos atributo eilutės pabaigoje:

```plantuml
class Customer {
  +email: string {description: "Primary contact email"} {pattern=^[^@]+@[^@]+$} {example: "user@example.com"}
  +age: int {minimum: 18} {maximum: 120}
  +nickname: string {nullable} {optional}
}
```

Šiuo metu palaikomos anotacijos:

- `{description: "..."}`
- `{example: "..."}`
- `{nullable}`
- `{pattern: "..."}`
- `{minimum: 1}`
- `{maximum: 10}`
- `{optional}` arba `{O}`

## Parametrai

`<<Path>>` klasės gali turėti susietas `<<Parameter ...>>` klases, kurios
apibrėžia operacijos parametrus. Palaikomi `path`, `query`, `header` ir
`cookie` parametrai.

```plantuml
class "OrderIdParam" <<Parameter path orderId>> {
  +value: uuid {description: "Order identifier"}
}

class "ListOrdersPage" <<Parameter query page>> {
  +value: int {minimum: 1} {description: "Page number"}
}

class "getOrder" <<Path>> <<GET /orders/{orderId}>> {}

"getOrder" --> "1" "OrderIdParam"
"getOrder" --> "0..1" "ListOrdersPage"
```

Jei `path` parametras nenurodytas eksplicitiškai, jis vis tiek sukuriamas iš
route placeholder'io, pvz. `/orders/{orderId}`.

## Kaip lenkti LLM praktikoje

LLM paprastai laimi ten, kur reikia spėti prasmę iš netvarkingos ar nepilnos
įvesties. Šio transformatoriaus stiprioji pusė yra kita: deterministinis
elgesys, atsekamumas, stabilus rezultatas ir aiškios taisyklės. Todėl geriausia
strategija nėra mėgdžioti LLM spėjimus, bet tapti geresniu ten, kur
inžinerinėse sistemose svarbiausia:

- niekada tyliai neišgalvoti semantikos;
- aiškiai parodyti dviprasmybes ir nepalaikomus atvejus;
- išlaikyti pastovią išvestį;
- leisti atsekti, iš kurios UML vietos atsirado konkretus OpenAPI elementas;
- palaikyti daugiau eksplicitinių validavimo ir dokumentavimo taisyklių.

Trumpai: LLM geriau spėja intenciją, o transformatorius turi geriau įrodyti
teisingumą.

## ASAP įgyvendinimo kelrodis

Žemiau pateiktas konkretus, greitai įgyvendinamas planas. Jis sąmoningai
prioritetizuoja mažos rizikos, didelės vertės pakeitimus, kurie stiprina
transformatoriaus patikimumą dar prieš imantis didesnių architektūrinių
plėtrų.

### 1 etapas: padaryti saugesnį už LLM

Tikslas: 1-3 dienos.

#### 1. Diagnostikos modelis per visą pipeline

Reikia įvesti bendrą diagnostikos rinkimo mechanizmą, kuris veiktų parse,
normalizavimo, transformavimo ir validavimo etapuose.

Pradinė apimtis:

- `warning` pranešimai apie nežinomus stereotipus;
- `warning` pranešimai apie nepalaikomas anotacijas;
- `warning` pranešimai apie neišspręstus ryšių taikinius;
- `warning` arba `error` apie blogai suformuotus kardinalumus;
- `error` apie konfliktuojančius `path + method` aprašus.

Kodinis įgyvendinimo taškas:

- išplėsti tarpinius tipus taip, kad transformacija galėtų grąžinti ne tik
  dokumentą, bet ir diagnostikos sąrašą;
- pradėti nuo lengvo modelio, pvz. `{ level, code, message, source? }`.

#### 2. Post-transform validavimo etapas

Po `OpenAPI` sugeneravimo reikia atlikti papildomą tikrinimą.

Pradinės taisyklės:

- visi `$ref` turi rodyti į egzistuojančias schemas;
- visi route placeholder'iai turi turėti `path` parametrus;
- operacijos negali turėti tuščių `responses`;
- `requestBody` turi būti generuojamas tik tada, kai yra aiškus šaltinis;
- paveldėjimo ir nuorodų struktūros neturi sudaryti akivaizdžių ciklų.

Nauda:

- tai leidžia transformatoriui nesukurti „plausible but wrong“ rezultato;
- LLM tokį lygį dažnai imituoja, bet negarantuoja.

#### 3. Kilmės (`x-source`) metaduomenys

Sugeneruotuose `OpenAPI` objektuose verta išsaugoti kilmės informaciją.

Minimalus tikslas:

- schemoms: UML klasės ar enum pavadinimas;
- laukams: UML atributo ar ryšio vardas;
- operacijoms: `<<Path>>` klasės pavadinimas;
- parametrams: `<<Parameter ...>>` klasės pavadinimas.

Galimas formatas:

```yaml
x-source:
  kind: class
  name: Customer
```

Jei vėliau bus patogu, galima pridėti ir eilutės numerį.

### 2 etapas: uždaryti akivaizdžias galimybių spragas

Tikslas: 3-7 dienos.

#### 4. Išplėsti anotacijų palaikymą

Dabartinis anotacijų mechanizmas jau yra gera bazė, todėl greičiausia plėtra
yra tęsti tą patį modelį.

Pirmi kandidatai:

- `{default: ...}`
- `{deprecated}`
- `{readOnly}`
- `{writeOnly}`
- `{minLength: 1}`
- `{maxLength: 255}`
- `{minItems: 1}`
- `{maxItems: 100}`

Nauda:

- mažiau poreikio „rankomis pataisyti“ rezultatą po transformacijos;
- mažiau erdvės LLM atrodyti „protingesniam“ vien dėl turtingesnės išvesties.

#### 5. Operacijų override'ai per stereotipus

Verta leisti eksplicitiškai aprašyti operacijos metaduomenis UML pusėje.

Pirmi kandidatai:

- `summary`
- `description`
- `operationId`
- `tag`
- `content-type`

Tai sumažina priklausomybę nuo automatiškai sugeneruotų bendrinių tekstų.

#### 6. Kanoninė išvesties tvarka

Reikia stabilizuoti sugeneruoto dokumento struktūrą, kad jis kuo mažiau
„judėtų“ tarp paleidimų.

Surikiuoti:

- `paths`;
- HTTP operacijas;
- `components.schemas`;
- `properties`;
- `required` laukus.

Nauda:

- patogesni diff'ai;
- mažiau triukšmo code review metu;
- aiškus pranašumas prieš LLM kintamą stilių.

### 3 etapas: padaryti įrankį patogesnį už LLM

Tikslas: 1-2 savaitės.

#### 7. `strict` ir `permissive` režimai

Du režimai leistų padengti skirtingus naudojimo scenarijus:

- `strict`: stabdyti transformaciją ties neaiškiais ar nepalaikomais atvejais;
- `permissive`: tęsti transformaciją, bet grąžinti diagnostikas ir taikyti
  konservatyvius fallback'us.

Tai ypač svarbu, jei projektas bus naudojamas ir CI, ir interaktyviame UI.

#### 8. Transformavimo ataskaita

Be galutinio `OpenAPI` dokumento verta turėti ir struktūrizuotą ataskaitą.

Ji galėtų parodyti:

- kas buvo perkelta tiesiogiai;
- kas buvo išvesta pagal taisykles;
- kas buvo praleista;
- kur reikalinga žmogaus peržiūra.

Tai būtų vienas aiškiausių produkto skirtumų nuo LLM.

## Rekomenduojama pirmo sprinto darbų seka

Jei tikslas yra pradėti iš karto ir turėti greitą rezultatą, siūloma tokia
eilė:

1. Įvesti diagnostikos modelį.
2. Pranešti apie neišspręstus ryšius, nepalaikomus stereotipus ir anotacijas.
3. Įdėti post-transform validavimo etapą.
4. Sugeneruoti `x-source` metaduomenis.
5. Parašyti testus diagnostikoms ir validatoriui.
6. Išplėsti anotacijų palaikymą su `default`, `deprecated`, `readOnly`, `writeOnly`.
7. Pridėti `minLength`, `maxLength`, `minItems`, `maxItems`.
8. Stabilizuoti išvesties rikiavimą.
9. Įvesti `strict` ir `permissive` režimus.
10. Pridėti transformavimo ataskaitą.

## Siūlomi GitHub stiliaus ticket'ai

Kad planą būtų galima iš karto išsiskaidyti į darbus, patogu pradėti nuo šių
užduočių:

1. `Add transform diagnostics collector and warning model`
2. `Report unresolved relation targets and unsupported stereotypes`
3. `Validate generated OpenAPI for missing refs and path params`
4. `Emit x-source metadata for schemas, properties, operations and parameters`
5. `Support default, deprecated, readOnly and writeOnly annotations`
6. `Support minLength, maxLength, minItems and maxItems annotations`
7. `Canonicalize OpenAPI output ordering`
8. `Introduce strict and permissive transform modes`
9. `Generate transform report with explicit, derived and skipped items`

## Kas gali palaukti

Šių darbų verta neliesti pačioje pradžioje:

- pilno `oneOf` / `anyOf` palaikymo;
- discriminator logikos;
- plugin architektūros;
- didelio parserio perrašymo;
- LLM integracijos kaip pagrindinio transformavimo mechanizmo.

Jie svarbūs, bet nepadės taip greitai padaryti įrankio praktiškai stipresnio už
LLM, kaip diagnostika, validacija, atsekamumas ir stabilesnė išvestis.
