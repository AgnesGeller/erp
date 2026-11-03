# Saját kertépítési munkalap és tényleges munkaidő – jóváhagyott terv

2026. november 3. Kiindulás: a fejlesztői PDF 15. fejezete (10. oldal), 25/18. átvételi forgatókönyve (14. oldal), a szerepkör-kiegészítés és az elkészült ERP 0.8.0. A felhasználó a tervet és a tesztek utáni ERP-élesítést jóváhagyta. Ez a lépés a kertépítési munkalap; a karbantartási tételes elszámolás külön, későbbi modul.

## Felhasználói működés

- Az iroda és az adott futó kertépítés aktív Építésvezetője rögzíthet és javíthat munkalapot. Dátum, közös érkezés/távozás, pipálható dolgozók; személyenként eltérő időpár és opcionális magyarázat. A felület tömör, lenyíló, magyar ABC-sorrendű.
- Egy személy egy munkalapon egyszer szerepel, akkor is, ha több szerepe van. Személyenként több munkafázis jelölhető; a teljes ideje egyszer számít, nem szorozzuk a kijelölt fázisok számával. Fázisonkénti percfelosztás nincs kikényszerítve.
- A kijelölhető emberek a már meglévő projekthozzárendelésekből és irodai személyekből jönnek. A munkalap nem oszt új szerepkört és nem hoz létre Auth-fiókot. Új munkatársat az iroda a meglévő Munkatársak és megbízások felületen rendel a kertépítéshez.
- Az iroda az ERP-s előzményeket olvashatja. A vezető az elérhető futó munkán kezelheti a munkalapokat. A Kertész/Kertépítő a saját sorait és saját munkaidő-statisztikáját olvashatja; nem szerkeszt más időt. A megrendelő csak a saját kertépítés összesített időmutatóját látja, személyes jelenléti időt és magyarázatot nem.
- A korábbi saját időösszesítés a projektről kilépés után is megmarad; ez nem ad hozzáférést a projekt többi adatához. Lezárt kertépítés munkalapjai ebben a lépésben nem módosíthatók; a lezárás utáni pénzügyi korrekciót a pénzügyi modullal együtt kell majd összekötni.

## Pontosan öt új saját ERP-tábla

| Tábla | Fő adatok és kapcsolat |
| --- | --- |
| erp.construction_worksheets | Stabil azonosító, szervezet/kertépítés FK, munkanap, közös időpár, aktuális verzió/revízió, érvényes/visszavont állapot, szerző és időpontok. |
| erp.construction_worksheet_versions | Változtathatatlan pillanatkép: teljes munkalap, dolgozók, ténylegesen használt időpárok, magyarázatok, fáziscímek, számolt percek, állapot, módosító/szerep/időpont. |
| erp.construction_worksheet_people | Az aktuális dolgozói sorok, személy FK, dátum, érkezési/távozási perc, adatbázisban számított idő, egyedi idő felülírása és magyarázat. Egyediség: munkalap/személy. |
| erp.construction_worksheet_tasks | Személyes sor → munkafázis kapcsolatok, saját projekt ellenőrzéssel és FK-val. Az idő innen nem többszöröződik. |
| erp.construction_worksheet_events | Megőrzött létrehozás/javítás/visszavonás/visszaállítás, tényleges gombnyomó/szerep/időpont, indok, verzió, egyszeri kérésazonosító, ujjlenyomat és visszaigazolás. |

Minden új tábla RLS/FORCE RLS védett. Közvetlen anon/authenticated táblaelérés nincs; kizárólag az ERP saját, Auth által igazolt és aktuális projekt-/szerepjogot ismét ellenőrző kiszolgálója ment. A privát függvények közvetlen végrehajtása tiltott. A meglévő Auth-fiókok, szerepkör-kiosztás és más alkalmazások változatlanok.

## Időszámítás és ötödik sáv

- Belső mértékegység a perc; egy munkanapon belül a távozás az érkezés után legyen. Többnapos munkát külön napi munkalapokon kell rögzíteni. A dátum és az idő magyar munkanapként értelmezett, nem a böngésző időzónájából kitalált eltolás.
- A PDF példája: két ember alapideje 7:30–15:30, egyikük 9:00–14:00 → 480 + 300 = **780 emberperc, 13 emberóra**.
- Ötödik sáv = az összes érvényes saját ERP-munkalap emberperce / aktuális tervezett emberperc × 100. A teljes projektadatbázis alapján számolunk, nem csak a lista aktuális oldalából.
- 100% fölötti érték is valósan látszik; a fennmaradó idő negatív lehet. Nulla/hiányzó tervnél nincs nullával osztás vagy kitalált százalék. Óra/nap/hét megjelenítés: 60 perc/óra, 7 óra/nap, 5 nap/hét; fölösleges tizedesnullák nélkül.
- A tervet a meglévő munkaterv aktív fázisaiból vesszük. Ha a részletes munkaterv még nincs létrehozva, az aktuális elfogadott ajánlat rögzített számításából olvassuk, ha ott megvan. Az eredeti tervidő és a négy valódi átvételi sáv nem íródik át.
- Személyszínek az ERP-ben már meglevő színekből jönnek. Megrendelőnek nincs belső személyes részletező. Az ügyfélnek számlázott kalkulációs óradíj továbbra is irodai adat; nem dolgozói bér.

## Duplikáció, javítás és offline működés

Átfedő személyes időre és azonos munkalapra figyelmeztetés kell. A mentési előnézet megmutatja a konfliktust; csak külön megerősített, továbbra is aktuális ellenőrzés után menthető. Más, nem elérhető kertépítés ügyféladatai nem szivároghatnak ki a figyelmeztetésben. Személyenként rendezett sorzárak védenek a párhuzamos ellenőrizetlen mentéstől; elveszett válasz ugyanazzal a kérésazonosítóval újrapróbálható, nem dupláz.

Revíziós mentés, megőrzött verziók, kötelező indokkal visszavonás, ellenőrzött visszaállítás; fizikai törlés nincs. Visszavont munkalap nem növeli az aktuális tényleges időt, de előzménye és résztvevői megmaradnak. A helyi piszkozat és függő kérés személy/szervezet/kertépítés/szerep szerint elkülönül. Offline nem színlelünk szerveres mentést vagy sikeres konfliktusellenőrzést.

Saját, jogosultság szerint szűrt letöltés/nyomtatás készülhet; nincs új fájltároló, előfizetés, levélküldő vagy külső szolgáltatás. A Kassza, Munkabér és a régi Munkalap adataihoz nem írunk, adataikat most nem költöztetjük és nem vesszük át.

## A meglévő ERP változásai

A saját munkaterv olvasása egy szerveroldali időösszesítővel és ötödik sávval bővül; a négy átvételi sáv változatlan. Új saját worksheet végpontok, munkalapablak és saját időnézet készül, a már működő munkamenet-kezeléssel. A megnyitott munkaterv mentés után frissül, másik eszköz az eddigi frissítéssel kapja meg. A README rövid marad, a részletek külön dokumentumban lesznek.

## Ellenőrzés és telepítés

Kötelező próbák: 780 perces PDF-példa; több fázis ugyanannak a személynek; egyéni felülírás visszaállítása; >100% és negatív maradék; nulla/hiányzó terv; visszavonás/visszaállítás; ütközés és új megerősítés; stabil UUID/idempotencia; elavult revízió; másik projekt/szerep tiltása; megrendelői és dolgozói adatszűrés; saját múltbeli összesítés; offline sor; mobil/asztali próba és teljes korábbi regresszió.

Csak a jóváhagyott terv és sikeres tesztek után: saját ERP-mentés, visszagörgetett migrációpróba, öt új tábla és saját függvények telepítése, gateway/felület élesítése, advisor és online ellenőrzés, magyar dokumentáció, main commit és push. A régi rendszerek működését nem módosítjuk.
