# Bejegyzések – fejlesztési állapot

2026. november 3. **Fejlesztési mentés, még nem éles modul.** Az alkalmazás kiadása továbbra is 0.7.1. Az új adatbázis SQL-je nincs telepítve; a gateway új bejegyzéskezelője nincs élesítve, a felületen nincs bekapcsolva. Más alkalmazás nem változott.

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

1. Kompakt, lenyíló bejegyzésfelület a kertépítés/munkafázis alatt: mind a nyolc típus, szöveg, helyi fotók, címzett, csapatláthatóság; mindig felső × és mentésvédelem. Az ügyfél extraigénye szabad szöveges; az iroda több Excel-típussal árazhatja.
2. Pontos régi/új ajánlati előnézet és külön megerősítés, irodai ellenajánlat, verzióválasztó, döntés, megjegyzés, javítás és káresemény. Helyi Visszavonás/Újra, hálózati kérések megőrzése. A dolgozó árat nem kaphat.
3. Helyi fotócsomag megnyitása/letöltése az engedélyezett szerep szerint. A meglévő `WorkMedia` újrahasznosítható; a fájlok nem kerülhetnek Supabase Storage-ba. A létrehozott `entry` teendőket a felületen a konkrét bejegyzéshez kell irányítani.
4. Mobil/asztali böngészőpróba szintetikus adatokkal; teljes regresszió, további visszavont hozzáférés- és stale-fázispróba. Csak ezek után saját ERP-mentés, visszagörgetett migrációpróba, jóváhagyott migráció/gateway/felület telepítése, advisor, rövid README, verzióemelés, commit/push és Pages-ellenőrzés.

## Fontos folytatási részletek

- A megvalósítást és a tesztek utáni ERP-élesítést a felhasználó már jóváhagyta: [részletes terv](bejegyzesek-valtozaskezeles-terv.md). Ugyanerre nem kell újra engedélyt kérni.
- Projekt: `cszsxjsiwaaibrocibyd`, kizárólag saját `erp`/`erp_private`. Éles gateway a mentéskor v17; 13 fájl. Következő telepítéshez az új `entries.ts` és generált `entry-model.ts` is kell.
- Az ismételt bejegyzéskérés ellenőrzése a kiszolgálón készített SHA-256 ujjlenyomatot használja; az SQL replay függvény ismét ellenőrzi a projektjogot. A felület ugyanazt a `request_id`-t és teljes payloadot küldje újra.
- Íráskor `entry_version`, `revision`, az aktuális `quote_version`, döntésnél `confirmed:true` kell. Az ügyfél/főnök által módosított pontos ajánlat új változatot és új döntést kíván.
- `entry_read` legfeljebb 100 legújabb bejegyzést/eseményt ad; az összes korábbi bejegyzéshez/eseményhez lapozást kell hozzáadni, ha a teljes napló a felületen megnyitható. A korábbi bejegyzésváltozat külön lekérdezhető.
- A kiszolgáló `entry_preview` → `entry_write` folyamata kész, de a böngészőből küldött előnézetet még a végső képernyőpróbáknak igazolniuk kell. A jóváhagyás előtti áradatot nem szabad éles megállapodásként megjeleníteni.
- Helyi adatbázispróbák: `tests/entries-database.test.mjs`, `tests/entries-gateway.test.mjs`, `tests/entry-model.test.mjs`. A tesztadatok szintetikusak.
