# Bejegyzések – fejlesztési állapot

2026. november 3. **Fejlesztési mentés, még nem éles modul.** Az alkalmazás kiadása továbbra is 0.7.1. Az új adatbázis SQL-je nincs telepítve; a gateway új bejegyzéskezelője nincs élesítve, a bejegyzésfelület nincs bekapcsolva. A `src/erp-entries.ts` és generált JS elkészült; a fő alkalmazás még nem példányosítja. Más alkalmazás nem változott.

## Elkészült és helyben ellenőrzött

- A jóváhagyott hat saját tábla és a szolgáltatói műveletek: `database/proposals/erp-project-entries.sql`.
- Nyolc bejegyzéstípus, szerep-/projektellenőrzés, változatelőzmény, archiválás/visszaállítás, szigorúan változathoz kötött döntések.
- Kétoldalú, atomi ajánlatváltozás; egyszeri alkalmazás, eredeti alapadatok megőrzése, puszta árnál megmaradó pipák, megváltozott munkatartalomnál új átvételi kör.
- Hiba javítása és megrendelői lezárása/újranyitása; felelősségi vita, üres tényleges kár, automatikus pénzügyi könyvelés nélkül.
- Kiszolgáló: `entries.ts`; saját Auth által igazolt személy, újraszámolt ajánlat, ügyfél-/dolgozói adatszűrés, azonos kéréssel biztonságos újrapróba.
- A meglévő munkatervi művelet ellenőrzi a látott fázisrevíziót és ajánlatverziót. Az új felület már küldi ezeket, a korábbi éles gateway továbbra is működik vele.
- Az ajánlati változásnapló a kiszámolt mennyiségeket/megállapodott árakat is kezeli. Az új áregyezmény kizárólag bejegyzésből menthető; hagyományos ajánlatmentéssel nem csempészhető be.
- **Teljes helyi regresszió: 300/300 sikeres.** Ezután négy további teszt készült; a 21 érintett számítási/adatbázispróba mind sikeres. A frontend-fordítás és a teljes érintett edge TypeScript-ellenőrzés is sikeres. Nincs csomagtelepítés vagy szülőmappabeli módosítás.

## Következő lépések ugyanitt

1. A `src/erp-entries.ts` új ablakának teljes irodai → ügyfél döntési böngészőpróbája, majd mobilnézet. Asztali helyi próbában működött a típusválasztás, árazás, előnézet és a piszkozat újratöltés utáni folytatása. Az áfaösszeg/áfakulcs ütközését javítottuk; a böngészőben 1600 Ft alap + 432 Ft áfa = 2032 Ft bruttó igazolt. A publikálás `confirm` ablakánál az IAB vezérlés időtúllépésre futott; a teljes döntési lánc felületi igazolása még hiányzik. Éles adat nem érintett.
2. A következő felületi részleteket még ellenőrizni/javítani kell: állapot- és megjegyzésmezők mentetlen tartalmának minden navigációs védelme; állapotfotó hozzáadása utáni látható lista; dolgozó fázisgombja ne nyisson szerkesztést; korábbi, újra megnyitott változat és helyi piszkozat stale-revíziója; minden hiba után látható, valóban újrapróbálható felület. A helyi Visszavonás/Újra és felső × kódja kész, de az összes felhasználói ág még nem igazolt.
3. Az ERP fő indításában csak a tesztek után példányosítandó az `EntryDesk(api,onError,onSaved)` és `workPlanDesk.setEntryDesk(entryDesk)`. Az `onSaved` hívhatja a `refreshAfterEntry()` metódust. A munkaterv/fázis/teendő gombok előkészítve vannak, példány nélkül nem látszanak; a régi éles gateway nem kap új végponthívást. A munkavégzőnek kizárólag olvasási belépő kell.
4. Teljes regresszió és edge ellenőrzés; csak ezután saját ERP-mentés, visszagörgetett migrációpróba, a már jóváhagyott migráció/gateway/felület telepítése, advisor, verzióemelés, SW új fájlok, rövid README, commit/push és Pages-ellenőrzés. A régi gateway v17 és az új modul nélküli 0.7.1 felület tovább működik.

## Második fejlesztési mentés ellenőrzései

- Nyolctípusú, kompakt új ablak; irodai több soros árazás, mennyiség/paraméter/ár javaslat, változatok, döntés, megjegyzés, hiba- és káradatok. Bejegyzésenkénti helyi fotócsomag, személy-/projekt-/bejegyzésazonosító-védelemmel.
- Személyváltás és késői válasz, bezárás/betöltés vs. tényleges mentés, eredeti payloados hálózati újrapróba, visszautasított művelet, elavult előnézet, helyi Visszavonás, eltérő személy piszkozatvédelme külön próbával ellenőrizve.
- Az előnézeti végpont nem végezhet döntést/állapotváltást. Munkavégzői exportból kimaradnak az ár-, felelősségi és belső árazási mezők. Másik bejegyzés csomagja ugyanazon a munkán sem importálható.
- **Teljes regresszió: 316/316 sikeres**, frontend-fordítás sikeres. Utána az új lapozási/visszavont-megbízás tesztekkel és munkatervi kapcsolódással a 26 érintett teszt szintén mind sikeres.
- Helyi, kizárólag szintetikus böngészőkiszolgáló: `.local/entries-browser-server.mjs`, 127.0.0.1:5232, utolsó session 66232. Adatbázisa memóriabeli és nem kapcsolódik Supabase-hez. A korábbi 13-as IAB lapon helyi megerősítés maradhatott; valódi ügyfélmunkát nem tartalmaz. A 5231-es korábbi bezárógomb-próba is kizárólag helyi.

## Fontos folytatási részletek

- A megvalósítást és a tesztek utáni ERP-élesítést a felhasználó már jóváhagyta: [részletes terv](bejegyzesek-valtozaskezeles-terv.md). Ugyanerre nem kell újra engedélyt kérni.
- Projekt: `cszsxjsiwaaibrocibyd`, kizárólag saját `erp`/`erp_private`. Éles gateway a mentéskor v17; 13 fájl. Következő telepítéshez az új `entries.ts` és generált `entry-model.ts` is kell.
- Az ismételt bejegyzéskérés ellenőrzése a kiszolgálón készített SHA-256 ujjlenyomatot használja; az SQL replay függvény ismét ellenőrzi a projektjogot. A felület ugyanazt a `request_id`-t és teljes payloadot küldje újra.
- Íráskor `entry_version`, `revision`, az aktuális `quote_version`, döntésnél `confirmed:true` kell. Az ügyfél/főnök által módosított pontos ajánlat új változatot és új döntést kíván.
- `entry_read` 100-as oldalakban adja a bejegyzéseket/eseményeket; `entry_cursor` és az `entry.event_cursor` időpont/azonosító párral lehet tovább lapozni. A korábbi bejegyzésváltozat külön lekérdezhető. A 101+ bejegyzés és 102 esemény teljes, ismétlésmentes lapozása tesztelt.
- A kiszolgáló `entry_preview` → `entry_write` folyamata kész, de a böngészőből küldött előnézetet még a végső képernyőpróbáknak igazolniuk kell. A jóváhagyás előtti áradatot nem szabad éles megállapodásként megjeleníteni.
- Helyi adatbázispróbák: `tests/entries-database.test.mjs`, `tests/entries-gateway.test.mjs`, `tests/entry-model.test.mjs`. A tesztadatok szintetikusak.
