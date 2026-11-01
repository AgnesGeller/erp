# Munkánkénti szerepkörök – PDF szerinti szabályok

Verzió: 0.1.9 · 2026. november 1.

A megrendelő a PDF és a kiegészítés szerinti megoldást kérte. A PDF 4. oldali szerepkörtáblája és 9. oldali átvételi lánca az alap. A kiegészítés 4. pontja a Csoportvezető szerepet két munkaterületi megnevezésre bontja.

| Választható szerep | Munkaterület | Jogosultsági alap |
| --- | --- | --- |
| Építésvezető | Kertépítés | Vezető: műszaki ellenőrzés, átvétel, anyagok és beszerzés követése. |
| Karbantartásvezető | Kertkarbantartás | Ugyanaz a vezetői alap, csak a karbantartási munkaterületen. |
| Kertépítő | Mindkét munkaterület | Munkavégzés és dolgozói készre jelentés. |
| Kertész | Mindkét munkaterület | A Kertépítővel azonos jogosultság, külön megnevezés. |

Az Iroda és a Megrendelő külön alkalmazásszerepkör marad, nem a munkatársi megbízás lenyíló eleme. Külön Projektvezető nincs. A dokumentumban meghatározott négy átvételi szint nem változik: Kertész/Kertépítő → adott munkaterület vezetője → Iroda → Megrendelő.

## Kiosztás és határok

- A szerepkört csak aktív irodai jogosultságú személy oszthatja ki. Több vezető és egy ember több szerepe is megengedett; ugyanannak az azonos szerepnek az átfedő megkettőzése nem.
- Az Építésvezető karbantartási munkára és a Karbantartásvezető kertépítésre nem rendelhető ilyen vezetőként. A két dolgozói szerep mindkét munkaterületen kiosztható.
- A vezető műszaki és beszerzési információt láthat, de belső pénzügyi eredményt nem kap, törzsárat nem szerkeszt és jogosultságot nem oszt. A karbantartási munkán a vezető a PDF szerint tételes ügyfélárat is láthat.
- A megkezdett, még érvényes és vissza nem vont, megfelelő munkára szóló megbízás ad hozzáférést. A jövőbeli, lejárt vagy visszavont megbízás nem.
- A hozzárendelési dátumok és a Budapest-időzóna kezelése változatlan. Megbízással rendelkező munka típusát nem lehet átírni, mert az a vezetői hatókört is megváltoztatná.

## Mi készült el ebben a kiadásban?

A négy szerepkör lenyílója, a munkatípushoz kötött választás, az irodai kiosztás és az adatbázisban is kikényszerített munkaterületi korlát. A munkatípus a saját erp.garden_projects munkamegbízási törzsben construction vagy maintenance. A korábbi alap-RPC alapértelmezése kertépítés; a részletes kertépítés- és karbantartás-létrehozás a munkakezelési modul feladata.

A public.erp_project_role_access szerveroldalon számítja az aktuális, munkánkénti engedélyeket: műszaki nézet, átvétel, beszerzés, karbantartási ügyfélár, belső pénzügy, törzsárszerkesztés és szerepkiosztás. A készülő üzleti API-knak ezeket a szabályokat szerveroldalon is érvényesíteniük kell; egy frontend gomb elrejtése nem jogosultságvédelem. A teljes átvételi, beszerzési és pénzügyi modul kész állapotát ez a kiadás nem jelenti.

Munka nélkül a négy szerep megtekinthető, de megbízás nem menthető. Nem hoztunk létre próbamunkát vagy éles próba-megbízást csak a bemutatás kedvéért.

## Megőrzés és ellenőrzés

A korábbi crew_lead és worker értékek történeti sorokban megmaradhatnak, új kiosztásuk már tiltott. Nem alakítunk át automatikusan régi szerepet nagyobb jogú új szereppé. A meglévő construction_lead az Építésvezető megnevezést kapja. A telepítéskor nulla munka és nulla megbízás szerepelt az ERP-ben; meglévő éles munkát nem soroltunk át.

A 106 sikeres automatikus teszt között külön ellenőrzés szerepel a két dolgozói szerep teljes engedélyegyezőségére, mindkét vezető munkaterületi korlátjára, a több vezetőre, az irodai kizárólagosságra, a más szervezettől való elkülönítésre, az időbeli érvényességre és visszavonásra. A munkatípus-korlát közvetlen adatbázisírásnál is ellenőrzött.

Módosítások: database/proposals/erp-work-roles.sql; src/erp-project-roles.ts; src/erp-office.ts. Csak ERP-objektumok érintettek; Munkalap, Kassza, Napi feladatok, Munkabér és meglévő ügyféladat nem változott.