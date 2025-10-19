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
