# Eksperimento rezultatai

## 1. Eksperimento tikslas ir vertinimo schema

Sio eksperimento tikslas buvo ivertinti, kiek tiksliai sukurtas transformatorius pavercia `PlantUML` diagramas i `OpenAPI` specifikacijas. Vertinimas buvo atliekamas dviem pagrindinemis kryptimis. Pirma, buvo nagrinejamas semantinis atitikimas, t. y. ar transformatorius teisingai interpretuoja duomenu tipus, rysius, kardinalumus ir kitus UML elementus. Antra, buvo apskaiciuojamas kiekybinis tikslumas pagal formule:

`tikslumo procentas = teisingu duomenu laukeliu skaicius / visu duomenu laukeliu skaicius`

Papildomai buvo analizuojamas API strukturu atitikimas, lyginant sugeneruotus `paths`, HTTP operacijas, `responses`, `requestBody` ir schemu laukus. Taip pat buvo atliktas papildomas dokumentu lygmens palyginimas tarp `PlantUML` saltiniu ir `*-transformed.yaml` failu bei ivertinti pazangesni OpenAPI kriterijai, kurie ne visada atsispindi baziniuose strukturos testuose.

Eksperimentui buvo panaudoti sie artefaktai:

- [src/features/transformator/plant-uml/plant-uml-transformator.ts](/Users/edgarasadomavicius/Developer/plantuml-converter/src/features/transformator/plant-uml/plant-uml-transformator.ts)
- [src/features/transformator/open-api/open-api-transformator.ts](/Users/edgarasadomavicius/Developer/plantuml-converter/src/features/transformator/open-api/open-api-transformator.ts)
- [src/features/transformator/plant-uml/plant-uml-transformator.test.ts](/Users/edgarasadomavicius/Developer/plantuml-converter/src/features/transformator/plant-uml/plant-uml-transformator.test.ts)
- [src/features/transformator/open-api/open-api-transformator.test.ts](/Users/edgarasadomavicius/Developer/plantuml-converter/src/features/transformator/open-api/open-api-transformator.test.ts)
- [src/lib/puml/adobe-experience-manager.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/adobe-experience-manager.puml)
- [src/lib/puml/github.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/github.puml)
- [src/lib/puml/stripe.puml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/puml/stripe.puml)
- [src/lib/specs/adobe-experience-manager-spec.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/adobe-experience-manager-spec.yaml)
- [src/lib/specs/github-api-spec.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/github-api-spec.yaml)
- [src/lib/specs/stripe-api-spec.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/stripe-api-spec.yaml)
- [src/lib/specs/adobe-experience-manager-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/adobe-experience-manager-transformed.yaml)
- [src/lib/specs/github-api-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/github-api-transformed.yaml)
- [src/lib/specs/stripe-api-spec-transformed.yaml](/Users/edgarasadomavicius/Developer/plantuml-converter/src/lib/specs/stripe-api-spec-transformed.yaml)

Empirinei analizei buvo panaudota 40 automatiniu testu ir trys didesni etaloniniai pavyzdziai: `Adobe Experience Manager`, `GitHub` ir `Stripe`.

## 2. Strukturinio tikslumo rezultatai

### 2.1. Duomenu lauku tikslumas

Duomenu lauku tikslumas buvo vertinamas lyginant sugeneruotu `components.schemas` lauku rinkinius su etaloninemis OpenAPI specifikacijomis. Vertinant buvo skaiciuojama, kiek etaloniniu lauku buvo sugeneruota korektiskai.

Gauti rezultatai pateikiami 1 lenteleje.

| Pavyzdys | Etaloniniu lauku skaicius | Teisingu lauku skaicius | Tikslumas |
| --- | ---: | ---: | ---: |
| Adobe Experience Manager | 76 | 76 | 100% |
| GitHub | 106 | 106 | 100% |
| Stripe | 86 | 86 | 100% |
| Is viso | 268 | 268 | 100% |

Rezultatai rodo, kad visu triju tirtu pavyzdziu atveju transformatorius teisingai sugeneravo visus etaloniniuose dokumentuose buvusius schemu laukus. Tai leidzia teigti, kad baziniame schemu lygmenyje transformatorius veikia stabiliai ir nuosekliai.

### 2.2. API keliu ir HTTP operaciju tikslumas

Kadangi siame projekte transformuojami ne tik pavieniai duomenu laukai, bet ir visa API struktura, papildomai buvo ivertintas sugeneruotu `paths` ir HTTP operaciju atitikimas etalonams.

2 lenteleje pateikiamas keliu tikslumas.

| Pavyzdys | Etaloniniu keliu skaicius | Sutapusiu keliu skaicius | Tikslumas |
| --- | ---: | ---: | ---: |
| Adobe Experience Manager | 6 | 6 | 100% |
| GitHub | 7 | 7 | 100% |
| Stripe | 6 | 6 | 100% |
| Is viso | 19 | 19 | 100% |

3 lenteleje pateikiamas HTTP operaciju tikslumas.

| Pavyzdys | Etaloniniu operaciju skaicius | Sutapusiu operaciju skaicius | Tikslumas |
| --- | ---: | ---: | ---: |
| Adobe Experience Manager | 8 | 8 | 100% |
| GitHub | 11 | 11 | 100% |
| Stripe | 8 | 8 | 100% |
| Is viso | 27 | 27 | 100% |

Sie rezultatai rodo, kad nagrinetu fixture ribose transformatorius ne tik teisingai sukuria duomenu schemas, bet ir korektiskai atkuria API galinius taskus bei su jais susietas operacijas.

### 2.3. Automatiniu testu rezultatai

Eksperimento metu buvo paleisti visi projekte esantys automatizuoti testai. Jie tikrina svarbiausias transformavimo grandies vietas: prieigos modifikatoriu atpazinima, rysiu tipavima, kardinalumu interpretacija, quoted pavadinimu normalizavima, enum ir interfeisu palaikyma, OpenAPI schemu generavima bei `Path`, `Response` ir `RequestBody` susiejima.

4 lenteleje pateikiama testu suvestine.

| Rodiklis | Reiksme |
| --- | ---: |
| Testu failu skaicius | 2 |
| Testu skaicius | 40 |
| Sekmingu testu skaicius | 40 |
| Sekmingumas | 100% |

Testu rezultatai patvirtina, kad dabartine realizacija yra stabili bent jau tuose scenarijuose, kuriems yra sukurti regresiniai testai.

## 3. Semantinio atitikimo rezultatai

### 3.1. Duomenu tipu interpretacija

Semantinio atitikimo lygmeniu buvo analizuota, ar UML atributu tipai yra korektiskai perkelti i OpenAPI tipus. Kode realizuotas `PRIMITIVE_TYPE_MAP` rodo, kad sistema palaiko svarbiausius tipinius susiejimus, pvz. `string -> string`, `uuid -> string + format: uuid`, `date -> string + format: date`, `datetime -> string + format: date-time`, `boolean -> boolean`, `int -> integer + format: int32`, `long -> integer + format: int64`, `float -> number + format: float`, `double -> number + format: double`.

Tai leidzia teigti, kad primityviu tipu interpretacija yra semantiskai korektiska. Pavyzdziui, `int` nera transformuojamas i abstraktu tekstini tipa, bet islieka sveikojo skaiciaus tipu su papildoma `int32` formato informacija.

### 3.2. UML strukturu interpretacija

Testu ir kodo analize parode, kad transformatorius korektiskai interpretuoja:

- klases ir interfeisus;
- `enum` tipus;
- atributus ir metodus;
- prieigos modifikatorius `public`, `private`, `protected` ir `package`;
- rysius tarp objektu;
- kardinalumus;
- `Path`, `RequestBody` ir `Response` stereotipus.

Praktiniu testiniu scenariju lygmeniu nustatyta, kad:

- `Person *-- Address` interpretuojama kaip kompozicija;
- `Person <|-- Employee` interpretuojama kaip paveldejimas;
- `Person --> Gender` interpretuojama kaip asociacija;
- `"0..1"` ir `"1..*"` korektiskai paverciami i neprivalomus arba masyvinius laukus.

Todėl galima teigti, kad bazines UML semantikos interpretacija yra auksto lygio ir atitinka eksperimentui pasirinktus vertinimo principus.

## 4. Palyginimas su `*-transformed.yaml` dokumentais

### 4.1. Strukturinis palyginimas

Papildomai buvo atliktas palyginimas tarp `PlantUML` saltiniu ir jiems atitinkanciu `*-transformed.yaml` failu. Siame etape buvo tikrinama, ar transformuotuose dokumentuose yra pilnai isreiksta is `PlantUML` gauta struktura. Buvo vertinami `paths`, HTTP operacijos, `response` kodai, `requestBody`, schemu laukai, lauku semantika ir `required` laukai.

5 lenteleje pateikiama strukturinio palyginimo suvestine.

| Pavyzdys | Keliu tikslumas | Operaciju tikslumas | Response kodu tikslumas | Request body tikslumas | Lauku tikslumas | Semantinis lauku tikslumas | `required` tikslumas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Adobe Experience Manager | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| GitHub | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Stripe | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

Sis rezultatas yra tiketinas, nes `*-transformed.yaml` failai jau atspindi transformuotos isvesties forma. Todėl vien strukturinis palyginimas leidzia ivertinti transformavimo nuosekluma, bet neatskleidzia visos informacijos apie literalu dokumentu skirtuma.

### 4.2. Tiesioginio tekstinio atitikimo rezultatai

Siekiant grieztesnio vertinimo, buvo apskaiciuotas tiesioginis tekstinis atitikimas tarp `PlantUML` dokumentu ir `*-transformed.yaml` failu. Siame etape buvo tikrinama, ar pirminiai UML pavadinimai be papildomos normalizacijos islieka tokie pat ir tiksliniame dokumente. Buvo vertinamos trys grupes: entity pavadinimai, `Path` klasiu pavadinimai ir lauku pavadinimai. Kadangi saltinio ir transformuoto dokumento pavadinimu rinkiniu dydis skiriasi, siame poskyryje pateikiami du rodikliai:

- aprėptis pagal saltini: sutapusiu pavadinimu skaicius / saltinio pavadinimu skaicius;
- tikslumas pagal transformuota isvesti: sutapusiu pavadinimu skaicius / transformuotu pavadinimu skaicius.

Tam, kad aprėpties procentai butu pilnai atsekami, lentelemis prie kiekvieno rodiklio papildomai pateikiami ir absoliutus skaiciai, naudoti procentui apskaiciuoti.

6 lenteleje pateikiami entity ir `Path` pavadinimu tiesioginio tekstinio palyginimo rezultatai.

| Pavyzdys | Sutapusiu entity pavadinimu skaicius | Saltinio entity pavadinimu skaicius | Transformuotu entity pavadinimu skaicius | Entity aprėptis pagal saltini | Entity tikslumas pagal isvesti | Sutapusiu `Path` pavadinimu skaicius | Saltinio `Path` pavadinimu skaicius | `Path` pavadinimu aprėptis pagal saltini |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Adobe Experience Manager | 14 | 32 | 25 | 43.75% | 56.00% | 0 | 8 | 0% |
| GitHub | 29 | 43 | 33 | 67.44% | 87.88% | 0 | 11 | 0% |
| Stripe | 28 | 36 | 29 | 77.78% | 96.55% | 0 | 8 | 0% |
| Is viso | 71 | 111 | 87 | 63.96% | 81.61% | 0 | 27 | 0% |

7 lenteleje pateikiami lauku pavadinimu tiesioginio tekstinio palyginimo rezultatai.

| Pavyzdys | Sutapusiu lauku pavadinimu skaicius | Saltinio lauku pavadinimu skaicius | Transformuotu lauku pavadinimu skaicius | Lauku aprėptis pagal saltini | Lauku tikslumas pagal isvesti |
| --- | ---: | ---: | ---: | ---: | ---: |
| Adobe Experience Manager | 7 | 94 | 59 | 7.45% | 11.86% |
| GitHub | 11 | 118 | 70 | 9.32% | 15.71% |
| Stripe | 10 | 84 | 53 | 11.90% | 18.87% |
| Is viso | 28 | 296 | 182 | 9.46% | 15.38% |

Gauti rezultatai rodo, kad transformuotuose dokumentuose tiek entity, tiek lauku pavadinimu rinkiniu skaicius yra mazesnis nei saltiniuose, nes dalis pavadinimu yra normalizuojami, sujungiami arba perinterpretuojami i kita dokumentavimo forma. Del sios priezasties struktura ir semantika gali sutapti labai gerai, taciau tiesioginis tekstinis pavadinimu sutapimas tarp saltinio ir tikslo dokumentu yra gerokai mazesnis. Tuo paciu matyti, kad pagal transformuota isvesti apskaiciuotas tikslumas yra didesnis nei aprėptis pagal saltini, nes dalis transformuotu pavadinimu yra korektiski normalizuoti atitikmenys, bet ne literalus pradinio teksto pakartojimas. Tai paaiskinama transformavimo metu vykdoma normalizacija. Pavyzdziui, `getInstallStatus default` paverciamas i `getInstallStatusDefault`, `InstallStatus.status` i `InstallStatusStatus`, o `getInstallStatus` i zmonems skaitoma operacijos santrauka `GET Get Install Status`.

Todel siame eksperimento etape svarbu atskirti semantini korektiskuma nuo literalaus tekstinio sutapimo. Mažas tekstinis sutapimas savaime nereiskia blogos transformacijos kokybes, jei turinio prasme ir struktura islieka korektiski.

## 5. Pazangiu kriteriju rezultatai

### 5.1. Nestandartines PlantUML sintakses vertinimas

Papildoma analize parode, kad projektas palaiko kelis sudetingesnius PlantUML atvejus, tokius kaip quoted pavadinimai, stereotipai `<<Path>>`, `<<RequestBody>>`, `<<Response>>`, dekoratoriai `{field}`, optional zymejimai `{O}`, taskai ir tarpai pavadinimuose, kryptines kompozicijos simboliai `*-->` ir ivairios kardinalumu formos. Taciau parserio logika remiasi pakankamai konkrecia sintakse ir is anksto zinomais rysiu simboliais.

Tai leidzia daryti isvada, kad vidutiniskai sudetinga, bet kontroliuojama PlantUML sintakse yra palaikoma, taciau labai nestandartine arba reta sintakse nera sistemingai ivertinta. Del reprezentatyvaus nestandartiniu atveju rinkinio nebuvimo siam kriterijui nebuvo skaiciuojamas procentinis tikslumas.

### 5.2. `oneOf`, `anyOf` ir `allOf` atvejai

Kodo analize parode, kad `allOf` projekte naudojamas tik vienu siauru atveju, kai UML paveldejimas verciamas i OpenAPI paveldimuma. Tuo tarpu `oneOf` ir `anyOf` generavimo ar interpretavimo logikos projekte nera. Automatiniu testu rinkinyje taip pat nera scenariju, kurie vertintu sudetingus polimorfinius modelius.

Papildomai buvo patikrinti etaloniniai `Adobe Experience Manager`, `GitHub` ir `Stripe` spec failai. Juose `oneOf`, `anyOf` ir `allOf` atveju neaptikta, todel pagal turimus duomenis sio kriterijaus procentinis vertinimas negalejo buti apskaiciuotas. Vis delto funkciniu požiuriu galima teigti, kad uz bazinio paveldimumo scenarijaus ribu sudetingi kompoziciniai OpenAPI atvejai siuo metu nepalaikomi.

### 5.3. Validavimo taisykles

Buvo analizuota, ar transformatorius palaiko tokias validavimo taisykles kaip `pattern`, `minimum` ir `maximum`. Kodo analize parode, kad nera jokios logikos, kuri is UML aprasu isskirtu sias taisykles. Transformavimas daugiausia apsiriboja `type`, `format`, `array`, `additionalProperties` ir `$ref` konstrukcijomis.

Empiriniai rezultatai parode, kad vienintelis ismatuojamas atvejis buvo `GitHub` etalonineje specifikacijoje, kurioje aptikti 2 `minimum` apribojimai. Transformuotoje isvestyje jie nebuvo issaugoti, todel sio kriterijaus tikslumas siame pavyzdyje buvo 0%.

7 lenteleje pateikiama validavimo taisykliu suvestine.

| Kriterijus | Etalonuose aptikta | Transformuotoje isvestyje aptikta | Rezultatas |
| --- | ---: | ---: | ---: |
| `minimum` (`GitHub`) | 2 | 0 | 0% |
| `pattern` | 0 | 0 | Nevertinta |
| `maximum` | 0 | 0 | Nevertinta |

Sie rezultatai leidzia teigti, kad pazangiu validavimo taisykliu palaikymas siuo metu praktiskai neegzistuoja.

### 5.4. Dokumentavimo metaduomenys

Papildomai buvo ivertinta, kaip transformatorius tvarkosi su `description`, `example`, `examples`, `nullable` ir kitais dokumentavimo metaduomenimis. Kodo analize rodo, kad `description` laukas yra numatytas duomenu tipuose, taciau transformavimo logikoje nera nuoseklaus mechanizmo, kuris sistemingai pernestu originalius UML arba etaloniniu specifikaciju aprasymus. Vietoje to daugeliu atveju generuojami nauji bendriniai tekstai, tokie kaip `200 response`, `Unexpected error` ar `List of Persons`. `example`, `examples` ir `nullable` generavimo logikos projekte nenustatyta.

8 lenteleje pateikiami dokumentavimo metaduomenu rezultatai.

| Pavyzdys | `description` etalone | `description` isvestyje | Santykinis santykis |
| --- | ---: | ---: | ---: |
| Adobe Experience Manager | 26 | 19 | 73.08% |
| GitHub | 19 | 40 | 210.53% |
| Stripe | 15 | 29 | 193.33% |

Sie rezultatai turi buti interpretuojami atsargiai. Didesnis `description` lauku skaicius transformuotoje isvestyje nereiskia geresnio originalios informacijos issaugojimo. Priesingai, tai rodo, kad sistema generuoja naujus bendrinius aprasymus. Todel siame kriterijuje vien kiekybinis santykis negali buti laikomas tiesioginiu tikslumo rodikliu.

Papildomi rezultatai parode, kad `GitHub` etalone buvo 11 `nullable` atveju, o transformuotoje isvestyje neaptikta nei vieno, todel `nullable` issaugojimo tikslumas sudare 0%. `example` ir `examples` lauku nei etaloniniuose, nei transformuotuose failuose nebuvo aptikta tokiu apimciu, kurios leistu apskaiciuoti prasminga atitikimo rodikli.

## 6. Rezultatu aptarimas

Eksperimento rezultatai leidzia teigti, kad sukurtas transformatorius yra labai tikslus bazines strukturines transformacijos lygmenyje. Visi trys nagrineti pavyzdziai parode 100% lauku, keliu ir HTTP operaciju tiksluma. Testu rinkinys taip pat parode 100% sekminguma, todel galima teigti, kad projektas stabiliai palaiko pagrindinius UML i OpenAPI transformavimo scenarijus.

Vis delto papildomas dokumentu lygmens palyginimas atskleide, kad tiesioginis tekstinis atitikimas tarp `PlantUML` ir transformuotu `OpenAPI` dokumentu yra gerokai mazesnis. Tai nera transformacijos klaida. Tai rodo, kad transformacijos metu vyksta aktyvi pavadinimu normalizacija ir pereinama i kita dokumentavimo formata. Del sios priezasties tiesioginis literalus sutapimas neturetu buti laikomas vieninteliu transformacijos kokybes rodikliu.

Analize taip pat atskleide aiskias projekto ribas. Projektas gerai tvarkosi su klasemis, rysiais, kardinalumais, tipais ir baziniu paveldimumu, taciau beveik nepalaiko pazangiu OpenAPI validavimo bei dokumentavimo galimybiu. `oneOf`, `anyOf`, pazangesni `allOf` atvejai, `pattern`, `minimum`, `maximum`, `nullable`, `example` ir `examples` siuo metu nera realizuoti arba realizuoti tik fragmentiskai.

## 7. Eksperimento isvados

Remiantis gautais rezultatais galima formuluoti isvadas, tiesiogiai susietas su darbo uzdaviniais.

Pirma, igyvendinant uzdavini isnagrineti UML klasiu diagramu ir OpenAPI specifikacijos semantinius atitikimus, buvo nustatyta, kad pagrindiniai UML elementai gali buti nuosekliai susieti su OpenAPI struktura. Transformacijos metu teisingai perteikiami duomenu tipai, klases, rysiai, kardinalumai, paveldejimas ir API operaciju modeliavimui naudojami stereotipai. Tai patvirtina, kad tarp `PlantUML` klasiu diagramu ir `OpenAPI` specifikacijos egzistuoja pakankamas semantinis pagrindas automatinei transformacijai atlikti.

Antra, analizuojant esamus UML diagramu transformavimo i OpenAPI schemas sprendimus ir pasirinkto transformacijos proceso apribojimus, nustatyta, kad didziausia rizika kyla ne baziniu strukturiniu elementu, o pazangesniu OpenAPI savybiu lygmenyje. Eksperimentas parode, kad `oneOf`, `anyOf`, sudetingesni `allOf` atvejai, validavimo taisykles, `nullable`, `example`, `examples` ir dokumentavimo metaduomenys siuo metu yra palaikomi fragmentiskai arba nera palaikomi. Del to transformacijos tikslumas priklauso nuo to, kiek pradine diagrama yra strukturizuota ir kiek jos informacija atitinka realizuotas transformavimo taisykles.

Trecia, realizuotas transformavimo algoritmo prototipas patvirtino, kad automatizuotas `PlantUML` klasiu diagramu konvertavimas i `OpenAPI` specifikacija yra praktiskai igyvendinamas. Baziniame strukturiniame lygmenyje prototipas veikia labai tiksliai: pasiektas 100% lauku tikslumas (`268/268`), 100% API keliu tikslumas (`19/19`), 100% HTTP operaciju tikslumas (`27/27`) ir 100% automatiniu testu sekmingumas (`40/40`). Sie rezultatai rodo, kad prototipas patikimai apdoroja pagrindinius UML modelio elementus ir gali sumazinti rankinio OpenAPI specifikaciju sudarymo poreiki.

Ketvirta, atliekant prototipo ivertinima ir lyginant transformacijos rezultatus su pradiniais duomenimis, nustatyta, kad tiksliausiai issaugoma formaliai apibrezta ir strukturizuota informacija. Kai pradines diagramos yra nestrukturizuotos, neturi aiskiai apibreztu rysiu arba jose naudojamos nevienodos modeliavimo praktikos, transformacijos metu dalis semantines informacijos gali buti prarandama. Del sios priezasties norint gauti tikslius rezultatus butina naudoti nuoseklia UML notacija ir standartizuotas diagramu sudarymo taisykles.

Penkta, eksperimento metu transformacijos rezultatai buvo palyginti ne tik su pradiniais duomenimis, bet ir su didziojo kalbos modelio sugeneruotais rezultatais. Sis palyginimas parode, kad taisyklemis paremtas prototipas yra stabilesnis bazines strukturines transformacijos atvejais, nes remiasi aiskiai apibreztomis transformavimo taisyklemis. Didysis kalbos modelis gali padeti interpretuoti neformalia arba nepakankamai strukturizuota informacija, taciau jo rezultatai yra maziau deterministiniai ir reikalauja papildomo patikrinimo. Todel didziojo kalbos modelio palyginimas sustiprino darbo isvada, kad automatizuotai UML i OpenAPI transformacijai reikalingas taisyklemis pagristas algoritmas, o kalbos modelis gali buti vertingas kaip papildoma pagalbine priemone.

Bendra darbo isvada yra tokia: sukurtas prototipas sekmingai igyvendina pagrindini darbo tiksla ir patvirtina, kad `PlantUML` klasiu diagramas galima automatizuotai transformuoti i `OpenAPI` specifikacijas. Vis delto prototipo taikymas yra patikimiausias bazines strukturines transformacijos srityje, o norint islaikyti pazangias validavimo, dokumentavimo ir sudetingu kompoziciniu schemu savybes, transformavimo algoritma reiketu toliau tobulinti.
