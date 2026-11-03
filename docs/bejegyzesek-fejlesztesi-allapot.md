# Bejegyzések – 0.8.0 kiadási állapot

2026. november 3. A korábban jóváhagyott hat saját ERP-táblás bejegyzés- és változáskezelés elkészült. [Használati útmutató](bejegyzesek.md) · [Jóváhagyott terv](bejegyzesek-valtozaskezeles-terv.md).

## Mi valósult meg?

- Nyolc bejegyzéstípus, projekt-/szerepellenőrzés, tényleges szerző/szerep/időpont, csapatláthatóság és a munkához tartozó címzettek.
- Pontos előnézet, kétoldalú és változathoz kötött döntés, irodai ellenajánlat, atomi és egyszeri alkalmazás. Elutasítás/visszavonás nem módosítja az ajánlatot.
- Megőrzött eredeti ajánlat és tervidő; árváltozásnál megmaradó valódi átvételek, tartalmi változásnál új kör, extra/törlés aktuális munkatervi hatása.
- Javítás megrendelői lezárása és újranyitása; vitatott felelősség, üresen hagyható tényleges kár, automatikus pénzügyi könyvelés nélkül.
- Felső ×, mentetlen mezők védelme, személy-/projekt-/szerepkörhöz kötött helyi piszkozat és eredeti kéréssel újrapróbálás. Lapozott lista és eseménynapló.
- Helyi fotó és szerep szerint szűrt csomag; külön bejegyzésazonosító, méret-/tartalom-/ellenőrzőösszeg-védelem. Supabase Storage és új előfizetés nincs.
- Munkatervi/fázis-/teendő belépő; jóváhagyás után a megnyitott saját ajánlat és PDF frissítése. Munkavégző nem szerkeszthet/árazhat/dönthet.

## Ellenőrzés és telepítés

- Végső teljes helyi regresszió: **327/327 sikeres**; az offline függőségi próba és az ajánlat/PDF-frissítés is benne van. Fordítás és edge típusellenőrzés sikeres.
- Szintetikus asztali böngészőben az irodai ajánlat → megrendelői elfogadás → alkalmazás végigment. Mobilos nézetben nincs vízszintes kilógás; a felső × elérhető. Az IAB Playwright-megerősítés problémáját saját, szintetikus tesztoldalon automatizált tesztmegerősítéssel és támogatott AX-műveletekkel kerültük meg; az alkalmazás valódi megerősítései megmaradtak.
- Élesítés előtti mentés: kizárólag helyi `.local/pre-entries-release-20261103.json` (gateway v17 és a lecserélt saját függvények). Nem kerülhet a publikus GitHubra.
- Visszagörgetett adatbázispróba: 6 új tábla, rollback után 0; sikeres.
- Saját migrációk telepítve: `erp_project_entries`, `erp_entry_actor_labels`. Gateway v19 ACTIVE, 15 forrásfájl; a meglévő Auth-kezelés és ellenőrzés változatlan.
- A hat új tábla RLS/FORCE RLS védett, nincs anon/authenticated közvetlen táblahozzáférés. Az új függvények nem hívhatók ezekkel a szerepekkel; csak a saját igazolt kiszolgálói út működik. Belépés nélküli éles végpont: HTTP 401.
- Az új modulnál nincs advisor WARN/ERROR vagy hiányzó FK-index. Az alapértelmezett tiltó RLS és az új, még nem használt indexek INFO jelzése várható. A projekt korábbi függvény-/Auth-/teljesítményjelzései változatlanul megmaradtak; más alkalmazást nem módosítottunk.

## Folytatás

Következő nagy egység a PDF szerint: saját ERP-munkalap és a tényleges munkaidő. A jelenlegi átvételi sávok tervezett időből számolnak; tényleges órát nem találnak ki. A régi Munkalap, Kassza, Napi feladatok és Munkabér továbbra is változatlan.
