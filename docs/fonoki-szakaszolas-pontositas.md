# A főnök szakaszolási pontosítása

2026. november 4. · Követelményfeljegyzés. A [részletes terv](szakaszolas-es-huzassal-rendezes-terv.md) és a felhasználó megvalósítási jóváhagyása alapján a fejlesztés megkezdhető; a funkció még nincs kész.

## Elvárt eredmény

A jóváhagyott területenkénti tétellista marad. Emellett külön, munkafolyamat szerinti kivitelezési lista kell, amely a különböző területeken szereplő, azonos szakaszba tartozó részfeladatokat közös szakaszba rendezi.

Példa: a füvesítési földkitermelés és az ültetőgödör kitermelése is **2. – Földkitermelés** alá kerüljön. Az első szakasz kertkarbantartás, a záró szakasz takarítás és levonulás. A Kiss Csaba-minta hét szakasza nem minden munka kötelező, rögzített felosztása.

## Kért kezelés

1. Kategória-/típusszerkesztésnél felsorolható részfolyamatok, hozzájuk rendelt szakaszsorszám és elnevezés. A közös alapbeállítást az adott tétel szükség esetén felülírhatja.
2. Kiviteli terv létrehozásakor a résztételek a szakaszsorszám alapján kerüljenek közös csoportba, miközben a forrásterületük, ajánlati soruk és mennyiségük azonosítható marad.
3. Munkánként kézi módosítás, szakasz létrehozása/átnevezése/sorrendje és részfeladat áthelyezése. Húzd és ejtsd támogatás, mobilon érintéses és billentyűzetes/fel-le gombos alternatívával. A függőségi kört vagy érvénytelen sorrendet ellenőrizni kell.
4. Szakaszon belül párhuzamosítható részfeladatok. Az átrendezés önmagában nem módosíthat elfogadott ügyfélárat, anyagmennyiséget, tényleges munkaidőt vagy valós átvételi előzményt.
5. A négyszintű átvétel, indokolt visszautasítás és helyi képek megmaradnak. A korábbi külön kérés szerinti „az ügyfél csak az iroda pipája után vehet át” eltér az eredeti átugrási szabálytól; a részletes megvalósítási tervben külön, következetes szabályt kell rögzíteni.
6. Négy nyomtatott/digitális szerepváltozat, jutalékra fordított százalék, új ajánlatokra érvényes központi földtérfogat-szorzó és külön dolgozói színbeállítás továbbra is nyitott követelmény.
7. Ahol természetes sorrend van, a húzással rendezés további jelölteként az ajánlati főtételek/sorok és munkalépések vizsgálandók. Műveleti jóváhagyást vagy pénzügyi elfogadást nem helyettesít húzás.

## A részletes tervben tisztázandó

Ha egy ajánlati sor több munkafázisra bomlik, a munkadíjban súlyozott teljesítmény és az időkeret nem számolható többször. Részfázisokra megőrzött, összesen 100%-os felosztás szükséges; a százalékok induló üzleti szabályát külön meg kell határozni. Nem találunk ki automatikusan árat vagy készre jelentést. Már működő, kipipált kertépítés átstrukturálása előzménymegőrző átállást igényel; meglévő pipát nem másolhatunk át önkényesen új részfeladatra.

A jelenlegi rendszer az ajánlati sorokat és területi csoportokat veszi át, és sorrendet/függőséget kezel; a fenti külön részfázis- és szakaszmodellhez még részletes, hatásvizsgált adatbázisterv és a felhasználó AGENTS.md 13. pontja szerinti jóváhagyás kell. Más alkalmazás ebben sem módosítható.
