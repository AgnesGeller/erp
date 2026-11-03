# Nyolc bejegyzéstípus és kétoldalú változáskezelés – jóváhagyott terv

2026. november 3. Alap: a fejlesztői PDF 12–13., 14–15., 22. és 25. fejezete. A 0.7.0 kiadás változatlanul használható. A felhasználó a konkrét tervet és a tesztek utáni saját ERP-élesítést jóváhagyta. A megvalósítás és saját ERP-élesítés 0.8.0-ban elkészült; [használat](bejegyzesek.md).

## A felhasználói működés

A kertépítésen belül az iroda, az Építésvezető és a kijelölt cím megrendelője az **Új bejegyzés hozzáadása** gombbal választ: Extra munka; Meglévő munka módosítása; Tétel törlése; Megjegyzés; Kérés; Panasz; Hibabejelentés; Káresemény. Szabad szöveg és több helyi fotó adható meg. A pénzügyi módosítás/törlés a kapcsolódó ajánlati sort is kijelöli. A megrendelőnek új extra kérésénél nem kell kategóriát vagy árat választania.

Minden bejegyzéshez szerző, tényleges szerep, időpont, projekt/fázis, címzett, állapot és megőrzött eseménynapló tartozik. A kivitelező a számára látható tartalmat olvashatja, bejegyzést és jóváhagyást nem hozhat létre. A szöveg/fotó csapatnak való megjelenítéséről külön jelölés dönt; alapból iroda és megrendelő látja. A dolgozói JSON nem tartalmaz ár-, beszerzési vagy felelősségi mezőt.

## Hat új, kizárólag ERP-s tábla

| Tábla | Tartalom és védelem |
| --- | --- |
| erp.project_entries | Projekt és opcionális fázis; típus, szerző/szerep, aktuális változat, állapot, láthatóság, címzett, mentési revízió. Szerveroldali projekt- és szerepellenőrzés. |
| erp.project_entry_versions | Változtathatatlan szöveges/fotóhivatkozásos változatok; árjavaslatok és kiszámolt végleges ajánlati tartalom; a kiinduló ajánlatverzió. Hibánál/javnál és káradatoknál a történet itt megmarad. |
| erp.project_entry_events | Változtathatatlan események és megjegyzések; tényleges szerző/szerep/időpont; állapotváltás, indok, előtte/utána hivatkozás és egyszeri kérésazonosító. |
| erp.project_entry_decisions | Pontos változathoz és célhoz kötött irodai/megrendelői döntések. Külön cél az árváltozás, a javítás átvétele és a felelősség megállapítása. Másik változatra nem használhatók fel. |
| erp.project_change_applications | Egy teljesen jóváhagyott változás egyszeri, atomi alkalmazása; régi/új ajánlatverzió, kapcsolódó döntések, alkalmazó és időpont. Kettős könyvelést/verziólétrehozást kizáró egyediség. |
| erp.project_task_terms | A munkafázis aktuális, jóváhagyott ajánlati adatai változatonként; aktív/törölt kapcsolat és az alkalmazás hivatkozása. Az eredeti munkafázis alapadatait és történetét nem írja át. |

Minden új tábla RLS/FORCE RLS védelemmel készül. Közvetlen anon/authenticated táblaírás nincs; az üzleti műveleteket az Auth által igazolt személy és a tényleges projektjog ellenőrzése után kizárólag a saját ERP-kiszolgáló végzi. Az új függvények alapértelmezett PUBLIC végrehajtása visszavonandó. Új Auth-rendszer, előfizetés vagy külső szolgáltatás nem készül.

## Pénzügyi jóváhagyás és ajánlatverzió

- Építésvezető indította extra/módosítás/törlés: irodai vizsgálat és árazás → irodai előterjesztés → megrendelői elfogadás/elutasítás.
- Iroda indította: az iroda pontos, kiszámolt ajánlata → megrendelő dönt.
- Megrendelő indította módosítás/törlés: az ő pontos javaslatát az iroda elfogadhatja vagy elutasíthatja. Bármilyen ellenajánlat új változat; a megrendelő újabb elfogadása kell. Árat nem tartalmazó extraigény előbb irodai árazást igényel.
- A megrendelő módosításnál mennyiséget, nyilvános paramétert és árat is javasolhat. A szerver az eredeti és a javasolt nyilvános feltételeket is megőrzi. Az irodai árkalkuláció az Excelből átvett motorral készül. Eltérő ügyfélfeltételeket ellenajánlatként kell visszaküldeni; a jóváhagyást nem lehet más összegre átvinni.
- Egy extraigényhez tetszőleges számú költségvetési sor tartozhat. Áfát, főtételt, mennyiséget és ügyfélnek látható megjegyzést a pontos jóváhagyandó változat tartalmazza.
- Elfogadás előtt a javaslat nem módosít ajánlatot, feladatot, anyaglistát vagy teljesítménysávot. Elutasítás/visszavonás sem változtatja a jelenlegi megállapodást.
- Alkalmazáskor egyetlen tranzakció hozza létre az új belső ajánlatverziót és az aktuális feladat-/anyagkapcsolatot. A régi kiküldött és elfogadott pillanatképek megmaradnak. Az alapnézet és PDF az aktuális változatot mutatja, a tételes változásnapló pedig a régi/új értékeket és elfogadókat.
- Közben megváltozott kiinduló ajánlatra régi döntés nem alkalmazható. Irodai újraellenőrzés és az új pontos tartalomhoz tartozó döntés szükséges.

## A meglévő munkaterv biztonságos bővítése

Az eredeti fázisazonosító, ajánlati alapadat, eredeti tervidő és régi átvételi esemény megmarad. A jóváhagyott aktuális feltételeket az új project_task_terms tárolja; a meglévő alapadat-védelmet nem kapcsoljuk ki.

**Javasolt pontos szabály:** ha csak az ár változik, a már ténylegesen rögzített átvételek megmaradnak, a súlyozott sávok az új jóváhagyott munkadíjjal újraszámolódnak. Ha a munkatartalom, mennyiség vagy mértékegység változik, az érintett fázisnál új átvételi kör kezdődik; a régi pipák az előzményben megmaradnak, az új tartalmat ismét át kell venni. Extra munkánál új fázis készül. Jóváhagyott törlésnél a fázis kiesik az aktuális tervből és nevezőből, de adata és eseménye nem törlődik. A függőségek változása is naplózott.

A terv-, ajánlat- és feladatrevízió ellenőrzése megakadályozza, hogy valaki a képernyő betöltése óta megváltozott munkára régi gombnyomással adjon átvételt. A bizonytalan hálózati mentés ugyanazzal a kérésazonosítóval újrapróbálható.

A meglévő ERP ajánlat- és munkatervfüggvényei az aktuális feltételek olvasásával bővülnek. Az eredeti ügyfélár és eredeti átvételi történet sem adminisztratív szerkesztéssel, sem egyszerű Undo művelettel nem írható felül. Már alkalmazott változást csak új, ellenoldalon is jóváhagyott kérelem fordíthat vissza.

## Hibajavítás és káresemény

Hibajelzés: bejelentve → ellenőrzés alatt → javítás folyamatban → javítva → megrendelő által lezárva vagy újranyitva. Előtte/utána fotó és indok megőrzött. A javítás nem automatikusan fizetős extra.

Kárnál hely/idő, leírás, érintett munka, feltételezett ok és felelős, becsült kár, opcionális tényleges kár és különbség kezelhető. A felelősség lehet kivitelező, megrendelő, harmadik fél vagy tisztázatlan. Végleges felelősséghez iroda és megrendelő pontos változatra adott közös jóváhagyása kell; eltérésnél vitatott. A rögzített állítás vagy elfogadott felelősség önmagában nem hoz létre fizetési tranzakciót.

## Fájlok, visszavonás és határok

Fotó és ZIP továbbra is a saját eszközön marad; Supabase-ben csak szöveg, hivatkozás és ellenőrzőadat. Kézi csomagátvitel a már engedélyezett, helyi fájltárolási irány szerint. Nincs új SMTP, MI-szolgáltatás, Storage vagy előfizetés. Fölösleges tizedesnullák nélkül, legfeljebb két tizedes látszik; a belső számítás pontos marad.

Piszkozatnál helyi Visszavonás/Újra és megerősített visszavonás; megőrzött előzményű bejegyzéseknél archiválás/visszaállítás, nem fizikai törlés. A régi Munkalap, Kassza, Napi feladatok, Munkabér, valamint a KAP/teszt-árajánlat kódja és adatbázis-objektumai nem módosulnak. Az ERP ügyféltörzsén sem szükséges változtatás.

## Kötelező ellenőrzések és élesítés

1. Mind a nyolc típus, három létrehozó szerep és dolgozói olvasási korlát; idegen projekt/cím, lejárt vagy visszavont hozzáférés tiltása.
2. Három kezdeményezési lánc; árazatlan extra, ellenajánlat, elutasítás és visszavonás; döntés pontos változathoz kötése.
3. Jóváhagyás előtti változatlan ajánlat; kétoldalú elfogadás után egyetlen új verzió; régi árak/pillanatképek és eredeti tervidők védelme.
4. Két párhuzamos kérelem, elavult ajánlat, dupla kattintás és elveszett válasz; ugyanaz a kérés nem alkalmazódhat kétszer.
5. Árváltozás, munkatartalom-változás, extra és törlés megfelelő munkatervi/progress hatása; régi pipák hiteles megőrzése.
6. Hiba javítása, ügyfél-visszaigazolás és újranyitás; üres tényleges kár; vitatott felelősség; nincs automatikus számlázás/kifizetés.
7. Ügyfél-/dolgozói JSON, PDF és fotócsomag adatszűrése; mobil/asztali próba; teljes korábbi regresszió.
8. Saját ERP-mentés, visszagörgetett tranzakciós próba, jóváhagyás után saját migráció és gateway/felület telepítése, irodai belépés védelme, advisor, rövid README, main commit/push és Pages-ellenőrzés.

**Jóváhagyva:** a fenti hat saját ERP-tábla, a változásjóváhagyási végpontok és a meglévő ERP-ajánlat/munkaterv olvasásának bővítése, a kiemelt átvételi szabállyal együtt; tesztek után kizárólag saját ERP-élesítés.
