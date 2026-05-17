# `person.puml` rezultatu palyginimas

## 1. Saltinis

Diagrama [person.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/person.puml:1) apraso penkis pagrindinius elementus:

- klase `Person` su atributais `name`, `age`, `address` ir metodu `greet()`;
- klase `Student` su atributu `module`;
- klase `Address` su atributu `address`;
- interfeisa `Speakable` su metodu `speak()`;
- `enum` tipa `Gender` su reiksmemis `MALE` ir `FEMALE`.

Be to, diagramoje yra du svarbus semantiniai rysiai:

- `Student` paveldi `Person` ([person.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/person.puml:25));
- `Person` turi kompozicini rysi su viena ar daugiau `Address` reiksmiu ([person.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/person.puml:26)).

## 2. Transformatoriaus rezultatas

Failas [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:1) is esmes teisingai perkelia pagrindine diagramos struktura i `OpenAPI`.

Stipriosios puses:

- `Person`, `Student`, `Address`, `Speakable` ir `Gender` yra issaugoti kaip atskiri komponentai ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:378), [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:405), [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:413), [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:432), [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:438));
- `Student` paveldimumas isreikstas per `allOf`, naudojant nuoroda i `Person` ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:438));
- `Person.address` interpretuotas kaip masyvas su `minItems: 1`, kas atitinka `1..*` kardinaluma ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:416));
- metodas `greet()` issaugotas kaip atskiras endpointas `/persons/{id}/greet` ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:235)).

Ribotumai:

- privatumas ir apsaugotas matomumas (`-age`, `#address`) OpenAPI lygmenyje neatskirti, nes abu laukai vis tiek tampa schemos laukais ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:416));
- `Speakable` interfeisas yra issaugotas tik kaip tuscias objektas su `x-methods`, bet nera susietas su kitais modeliais ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:432));
- sugeneruoti CRUD endpointai (`/persons`, `/students`, `/address`) nera tiesiogiai uzrasyti `PlantUML` diagramoje, jie yra transformatoriaus interpretacija, o ne literalus diagramos turinys ([person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:7)).

## 3. LLM rezultatas

Failas [person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:1) taip pat atpazista pagrindines klases, taciau generuoja daugiau spejimu, kurie nera tiesiogiai pagristi diagrama.

Teigiami aspektai:

- atskirai sugeneruoti `Person`, `Student`, `Address`, `Speakable` ir `Gender` komponentai ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:293));
- `Student` paveldimumas taip pat modeliuojamas per `allOf` ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:350));
- `Gender` enum reiksmės perduotos korektiskai ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:396)).

Pagrindines problemos:

- pridetas `id` laukas ir `uuid` formatas, nors diagrama tokio atributo neturi ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:297), [person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:377));
- vietoje vieno kompozicinio lauko atsiranda du laukai: `address: string` ir `addresses: Address[]`, nors diagramoje yra tik atributas `address: String` ir rysys su `Address` ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:310));
- sugeneruoti papildomi modeliai `PersonCreate`, `PersonUpdate`, `StudentCreate`, `StudentUpdate`, `AddressCreate`, kuriu diagrama neapraso ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:317));
- sugeneruoti `patch` metodai, serverio URL ir bendriniai `Error` response komponentai yra papildoma API interpretacija, o ne diagramos turinys ([person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:5), [person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:93), [person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:274));
- diagrama turi metoda `greet()`, bet LLM isvestyje jam nera atskiro endpointo ar kitos aiskios reprezentacijos ([person.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/person.puml:6)).

## 4. Tiesioginis palyginimas

| Kriterijus | `person-transformed.yaml` | `person-llm.yml` |
| --- | --- | --- |
| Klasiu atitikimas | Aukstas | Aukstas |
| Paveldimumo atitikimas | Teisingas `Student -> Person` | Teisingas `Student -> Person` |
| Kompozicijos `Person o-- "1..*" Address` interpretacija | Teisingai kaip `Address[]` su `minItems: 1` | Dalinai teisinga, bet pridetas perteklinis `address: string` ir atskiras `addresses[]` |
| Metodu atvaizdavimas | `greet()` issaugotas kaip endpointas | `greet()` prarastas |
| Papildomu, diagramoje neraanciu elementu kiekis | Vidutinis | Didelis |
| Artimumas saltinio semantikai | Didesnis | Mazesnis |

### 4.1. Rezultatu suvestine

| Vertinimo sritis | `person-transformed.yaml` rezultatas | `person-llm.yml` rezultatas | Geresnis rezultatas |
| --- | --- | --- | --- |
| Saltinio objektu atpazinimas | Atpazinti visi pagrindiniai objektai: `Person`, `Student`, `Address`, `Speakable`, `Gender` | Atpazinti visi pagrindiniai objektai: `Person`, `Student`, `Address`, `Speakable`, `Gender` | Lygus |
| Atributu issaugojimas | Issaugoti visi esminiai domeno atributai ir rysio laukas | Issaugoti esminiai atributai, bet prideti `id` laukai | Transformatorius |
| Tipu interpretacija | `String -> string`, `Int -> integer(int32)`, `1..* -> array + minItems: 1` | `String -> string`, `Int -> integer`, `1..* -> array + minItems: 1` | Transformatorius |
| Paveldimumas | `Student` schema sudaryta per `allOf` su `Person` | `Student` schema sudaryta per `allOf` su `Person` | Lygus |
| Kompozicija | Vienas nuoseklus `Person.address` kaip `Address[]` | Dviguba interpretacija: `address: string` ir `addresses: Address[]` | Transformatorius |
| Metodai | `greet()` paverstas i `/persons/{id}/greet` | `greet()` nepristatytas | Transformatorius |
| API issamumas | Sugeneruotas standartinis CRUD ir metodo endpointas | Sugeneruotas platesnis CRUD su `patch`, `Create` / `Update` schemomis ir bendrais atsakymais | LLM, jei prioritetas yra API sablonas |
| Atsekamumas iki `person.puml` | Aukstas | Vidutinis | Transformatorius |

### 4.2. Objektu palyginimo lentele

| Objektas is `person.puml` | Saltinio prasme | `person-transformed.yaml` | `person-llm.yml` | Vertinimas |
| --- | --- | --- | --- | --- |
| `Person` | Pagrindine klase su atributais ir metodu | Yra schema `Person`; turi `name`, `age`, `address`; turi `x-methods.greet` | Yra schema `Person`; turi `id`, `name`, `age`, `address`, `addresses` | Abu atpazista objekta, bet LLM prideda `id` ir dubliuoja adreso semantika |
| `Student` | `Person` potipis su `module` | Yra `Student` per `allOf` + `module` | Yra `Student` per `allOf` + `module` | Abu teisingai perteikia paveldimuma |
| `Address` | Adreso objektas su `address` atributu | Yra `Address` su `address` | Yra `Address` su `id` ir `address` | Transformatorius tikslesnis, nes neprideda `id` |
| `Speakable` | Interfeisas su `speak()` metodu | Yra schema `Speakable` su `x-methods.speak` | Yra tuscia schema `Speakable` | Transformatorius geriau issaugo metodo informacija |
| `Gender` | Enum su `MALE`, `FEMALE` | Yra `Gender` enum su `MALE`, `FEMALE` | Yra `Gender` enum su `MALE`, `FEMALE` | Abu teisingi |

### 4.3. Atributu palyginimo lentele

| Saltinio atributas arba rysys | Saltinio tipas / semantika | `person-transformed.yaml` | `person-llm.yml` | Tikslumo ivertinimas |
| --- | --- | --- | --- | --- |
| `Person.name` | `String`, public, privalomas | `name: string`, `required` | `name: string`, `required` | Abu teisingi |
| `Person.age` | `Int`, private, neprivalomas pagal transformatoriaus taisykles | `age: integer`, `format: int32`, ne `required` | `age: integer`, `required` | Transformatorius geriau atspindi matomumo taisykle |
| `Person.address` atributas | `String`, protected | Neislaikytas kaip atskiras tekstinis atributas; perinterpretuotas per rysi su `Address` | `address: string`, `required` | LLM islaiko atributini teksta, bet neatskiria protected semantikos |
| `Person o-- "1..*" Address` | Vienas ar daugiau `Address` objektu | `address: Address[]`, `minItems: 1`, `required` | `addresses: Address[]`, `minItems: 1`, `required` | Abu atpazista rysi, transformatorius maziau dubliuoja semantika |
| `Student.module` | `String`, public, privalomas | `module: string`, `required` | `module: string`, `required` | Abu teisingi |
| `Address.address` | `String`, public, privalomas | `address: string`, `required` | `address: string`, `required` | Abu teisingi |
| `Person.id` | Nera saltinyje | Nera | `id: string`, `format: uuid` | LLM perteklius |
| `Address.id` | Nera saltinyje | Nera | `id: string`, `format: uuid` | LLM perteklius |

### 4.4. Tipu palyginimo lentele

| UML tipas / konstrukcija | Tiketinas OpenAPI atitikmuo | `person-transformed.yaml` | `person-llm.yml` | Pastaba |
| --- | --- | --- | --- | --- |
| `String` | `type: string` | Naudojamas `name`, `module`, `Address.address` laukuose | Naudojamas `name`, `address`, `module`, `Address.address` laukuose | Abu korektiskai interpretuoja bazini string tipa |
| `Int` | `type: integer`; pageidautina `format: int32`, jei taikoma taisykle | `type: integer`, `format: int32` | `type: integer` | Transformatorius tikslesnis pagal deklaruotas tipo taisykles |
| `void` metodas | Veiksmo endpointas arba metodo metaduomenys be response body | `/persons/{id}/greet` su `204` ir `x-methods` | Nera aiskios reprezentacijos | LLM praranda elgsenos elementa |
| `1..*` kardinalumas | `type: array`, `minItems: 1` | `address: array`, `items: Address`, `minItems: 1` | `addresses: array`, `items: Address`, `minItems: 1` | Abu atpazista kardinaluma, bet LLM prideda ir atskira tekstini `address` |
| Enum `Gender` | `type: string`, `enum: [MALE, FEMALE]` | Atitinka | Atitinka | Abu teisingi |
| Interfeisas `Speakable` | Schema arba metaduomenys, saugantys `speak()` | `type: object` + `x-methods.speak` | `type: object`, `additionalProperties: false` | Transformatorius geriau issaugo interfeiso turini |

### 4.5. Trukumu lentele

| Trukumas | `person-transformed.yaml` | `person-llm.yml` | Poveikis tikslumui |
| --- | --- | --- | --- |
| Papildomi domeno atributai | Nera esminiu papildomu domeno atributu | Prideti `Person.id` ir `Address.id` | Mazina LLM lauku tiksluma |
| Dviguba adreso interpretacija | `Person.address` naudojamas kaip rysys su `Address[]` | Yra ir `address: string`, ir `addresses: Address[]` | LLM schema tampa dviprasmiska |
| Matomumo semantika | `age` ir `address` vis tiek patenka i `properties`, bet `age` nera `required` | `age` ir `address` padaryti `required` | LLM silpniau atspindi UML matomuma |
| Metodo `greet()` praradimas | Neprarastas, yra endpointas ir `x-methods` | Prarastas | Reiksmingas LLM semantinis trukumas |
| Interfeiso metodo `speak()` praradimas | Neprarastas, yra `x-methods.speak` | Prarastas | LLM prasciau issaugo interfeiso turini |
| Papildomi API modeliai | Tik `ApiError` kaip pagalbine klaidos schema | `PersonCreate`, `PersonUpdate`, `StudentCreate`, `StudentUpdate`, `AddressCreate`, `Error` | LLM labiau nutolsta nuo saltinio |
| Papildomi endpointai | CRUD endpointai ir `greet` yra transformatoriaus interpretacija | CRUD, `patch`, serveriai ir bendri response komponentai | Abu turi interpretacijos, bet LLM jos daugiau |

## 5. Duomenu atitikimo analize

Papildomai galima ivertinti, kiek tiksliai abi specifikacijos atitinka `person.puml` duomenis pagal schema lygmens laukus. Siame palyginime vertinami tik domeno modeliu laukai, t. y. `Person`, `Student` ir `Address` schemos. Pagalbine infrastruktura, tokia kaip `Error`, `ApiError`, serverio nustatymai ar CRUD pagalbiniai modeliai `PersonCreate` ir `PersonUpdate`, nera laikoma pradines diagramos duomenimis.

Vertinimui taikoma si formule:

`tikslumo procentas = teisingu duomenu laukeliu skaicius / visu duomenu laukeliu skaicius`

Kadangi `Person` klaseje yra ir atributas `address: String`, ir atskiras kompozicinis rysys su `Address`, vertinimas atliekamas semantiskai, o ne vien pagal literalu pavadinimo sutapima. Jei specifikacija islaiko rysi su `Address` kolekcija ir kardinalumu `1..*`, toks laukas laikomas teisingu net jeigu jo forma OpenAPI dokumente siek tiek normalizuota.

### 5.1. Vertinami saltinio duomenu laukai

Is `person.puml` gaunami sie domeno duomenu laukai:

- `Person.name`
- `Person.age`
- `Person` rysys su `Address` (`1..*`)
- `Student.module`
- `Address.address`

Tai reiskia, kad siame eksperimente saltinio duomenu lauku skaicius yra `5`. Sis skaicius tampa etalonine reikshme, su kuria lyginamos abi sugeneruotos specifikacijos.

### 5.2. Vertinimo logika

Kad analize butu nuosekli, kiekvienas laukas buvo vertinamas pagal tris klausimus:

1. Ar laukas apskritai egzistuoja sugeneruotoje specifikacijoje?
2. Ar jo tipas arba rysio forma atitinka diagramos prasme?
3. Ar prie lauko neatsiranda papildoma, diagramos nepagrysta interpretacija?

Pagal sia logika laukai skirstomi i dvi grupes:

- teisingi laukai: laukai, kurie tiesiogiai arba semantiskai atitinka `person.puml`;
- papildomi laukai: laukai, kurie sugeneruoti specifikacijoje, bet nera pagrindziami diagrama.

Tokiu budu tikslumo procentas rodo ne tik tai, kiek diagramos duomenu buvo issaugota, bet ir kiek isvestis liko disciplinuota, nepridedant pertekliniu objektiniu ar REST lygmens detaliu.

### 5.3. Duomenu atitikimo lentele

| Specifikacija | Visu duomenu lauku skaicius | Teisingu duomenu lauku skaicius | Tikslumas |
| --- | ---: | ---: | ---: |
| `person-transformed.yaml` | 5 | 5 | 100.00% |
| `person-llm.yml` | 8 | 6 | 75.00% |

### 5.4. Lauku detalizacija

Toliau pateikiama, kaip kiekvienas saltinio laukas atsispindi sugeneruotose specifikacijose.

| Saltinio elementas | `person-transformed.yaml` | Vertinimas | `person-llm.yml` | Vertinimas |
| --- | --- | --- | --- | --- |
| `Person.name` | `name: string` | Teisingas | `name: string` | Teisingas |
| `Person.age` | `age: integer(int32)` | Teisingas | `age: integer` | Teisingas |
| `Person -> Address (1..*)` | `address: Address[]` su `minItems: 1` | Teisingas | `addresses: Address[]` su `minItems: 1` ir papildomas `address: string` | Dalinai teisingas |
| `Student.module` | `module: string` | Teisingas | `module: string` | Teisingas |
| `Address.address` | `address: string` | Teisingas | `address: string` | Teisingas |

Si lentele parodo, kad didziausias skirtumas tarp rezultatu yra ne baziniu atributu tipuose, o rysio interpretacijoje tarp `Person` ir `Address`. Transformatorius pasirinko viena nuoseklu reprezentavimo buda, o LLM vienu metu paliko ir atributini, ir reliacini varianta, del ko schema tapo dviprasmiska.

### 5.5. Papildomu lauku analize

`person-transformed.yaml` atveju papildomu domeno lygmens lauku sioje analizeje neaptikta. Nors dokumente atsiranda CRUD `paths` ir `ApiError`, jie nera itraukti i duomenu lauku skaiciu, nes nepriklauso modelio atributams.

`person-llm.yml` atveju aptinkami sie papildomi laukai:

- `Person.id`
- `Address.id`

Abu sie laukai atrodo logiski tipinei REST API schemai, taciau jie nera isvesti is `person.puml` diagramos. Del to jie didina bendru lauku skaiciu, bet nedidina teisingu lauku skaiciaus, ir taip mazina galutini tiksluma.

Svarbu pamineti, kad LLM taip pat sugeneruoja papildomus modelius `PersonCreate`, `PersonUpdate`, `StudentCreate`, `StudentUpdate` ir `AddressCreate`. Jie nera traukiami i pagrindine lentele, nes kitaip butu vertinamas jau ne vien diagramos duomenu atitikimas, o platesne API projektavimo interpretacija. Jei sie modeliai butu itraukti i vertinima, LLM rezultato tikslumas dar labiau sumazetu.

### 5.6. Rezultatu interpretacija

`person-transformed.yaml` atveju visi penki domeno laukai yra pagristi pradine diagrama. `Person` modelyje issaugomi `name` ir `age`, kompozicinis rysys su `Address` interpretuotas kaip masyvas su `minItems: 1`, `Student` issaugo `module`, o `Address` issaugo lauka `address`.

`person-llm.yml` atveju taip pat atpazistami visi pagrindiniai diagramos duomenys, taciau bendra lauku aibe tampa platesne uz saltini. Prie teisingu lauku priskiriami `Person.name`, `Person.age`, `Person.address`, `Person.addresses`, `Student.module` ir `Address.address`. Taciau papildomi `Person.id` ir `Address.id` laukai diagramos nebuvo nurodyti, todel jie mazina bendra tikslumo procenta.

Sis rodiklis gerai parodo skirtuma tarp abieju prieigu. Realizuotas transformatorius generuoja kompaktiska ir i diagrama orientuota lauku aibe, o LLM linkes prideti papildomus REST stiliaus laukus, kurie atrodo prasmingi API kontekste, bet nera tiesiogiai isvesti is `PlantUML` modelio.

Kitaip tariant, realizuoto transformatoriaus stiprybe yra deterministinis atitikimas saltiniui, o LLM stiprybe yra platesne API interpretacija. Taciau siame eksperimente prioritetas teikiamas butent tikslumui saltinio atzvilgiu, todel papildomi spejimai laikomi trukumu, o ne privalumu.

## 6. Platesnis semantinis vertinimas

Vien duomenu lauku procento nepakanka pilnam ivertinimui, nes dvi specifikacijos gali tureti panasu lauku skaiciu, bet skirtis tuo, kaip jos perteikia diagramos prasme. Del to verta atskirai aptarti keturis semantinius aspektus: paveldimuma, kardinaluma, metodu issaugojima ir modelio grynuma.

### 6.1. Paveldimumo issaugojimas

Abi specifikacijos teisingai atpazista, kad `Student` paveldi `Person`. Tai yra vienas stipriausiu sutapimu tarp realizuoto transformatoriaus ir LLM. Abiem atvejais paveldimumas realizuojamas per `allOf`, todel siame kriterijuje esminio skirtumo nera.

### 6.2. Kardinalumo interpretacija

Svarbiausia semantine vieta siame pavyzdyje yra rysys `Person o-- "1..*" Address`. Realizuotas transformatorius si rysi perteikia nuosekliai: `Person` turi masyva `Address[]` ir `minItems: 1`. Tai labai artimas atitikmuo UML kardinalumui.

LLM taip pat atpazista, kad egzistuoja adresu kolekcija, taciau kartu palieka ir pavieni `address: string` lauka. Del to galutine schema ima perteikti dvi konkuruojancias interpretacijas:

- arba `Person` turi tekstini adresa;
- arba `Person` turi adresu objektu kolekcija.

Tokio dvigubo modelio pati diagrama neapraso, todel semantinis tikslumas sioje vietoje yra mazesnis.

### 6.3. Metodu issaugojimas

`Person` klase turi metoda `greet()`. Realizuotas transformatorius si metoda issaugo atskiru endpointu `/persons/{id}/greet`, todel veiksenos informacija is diagramos nedingsta.

LLM rezultate metodo reprezentacijos nera. Tai rodo, kad LLM buvo labiau orientuotas i tipini CRUD API generavima nei i pilna UML elgsenos elementu issaugojima.

### 6.4. Modelio grynumas

Modelio grynumas siame kontekste reiskia, kiek sugeneruota specifikacija lieka arti pradinio modelio, nepridedant savarankisku projektavimo sprendimu. Pagal si kriteriju realizuotas transformatorius yra nuoseklesnis:

- jis prideda API struktura, bet neisplecia paciu domeno modeliu pertekliniais atributais;
- jis neiveda nauju identifikatoriu ar papildomu kurimo/atnaujinimo schemu kaip domeno tiesos saltinio.

LLM, priesingai, pereina nuo transformacijos prie interpretacinio dizaino. Toks sprendimas gali buti naudingas praktiniame API projektavime, bet jis blogina atsekamuma tarp `PlantUML` ir galutines specifikacijos.

## 7. Isvada

Jei vertinama, kuri specifikacija yra artimesne originaliai `person.puml` diagramai, tikslesnis yra realizuoto transformatoriaus rezultatas [person-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-transformed.yaml:1). Jis geriau issaugo diagramos semantika: paveldimuma, kompozicijos kardinaluma ir metoda `greet()`.

LLM sugeneruotas rezultatas [person-llm.yml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/person-llm.yml:1) atrodo labiau kaip bendrinis ranka suprojektuotas REST API sablonas. Jame atsiranda papildomi `id`, `Create` ir `Update` modeliai, `patch` operacijos, serverio nustatymai ir kiti elementai, kuriu diagrama tiesiogiai nepateikia. Del to LLM isvestis yra maziau istikima saltiniui, nors formaliai atrodo issamesne.

Vertinant tik duomenu laukus, realizuotas transformatorius pasiekia `100.00%` tiksluma, nes visi sugeneruoti domeno laukai yra pagristi diagrama. LLM rezultatas pasiekia `75.00%`, nes be teisingai atpazintu lauku jis papildomai generuoja diagramos nepatvirtintus `id` laukus. Vertinant placiau, ne tik kiekybini lauku sutapima, bet ir semantini tiksluma, tas pats desningumas islieka: realizuotas transformatorius geriau atkuria pirmini modeli, o LLM dazniau kuria interpretacine API versija.
