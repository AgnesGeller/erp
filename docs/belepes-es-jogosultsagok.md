# Irodai belépés és jogosultságkezelés – 0.1.4 történeti állapot

Állapot: 0.1.4 · 2026. október 30.

**Az alábbi korábbi leírást a 0.1.5 módosította. A meglévő info@ fiók ERP-tagsága inaktív, az új irodai belépések önállóak; a munkamenet megjegyezhető. Aktuális használat és műszaki leírás: [Irodai belépés](irodai-belepes.md).**

## Mire használható most?

Az ERP saját irodai belépési felülete és kiszolgálója elkészült. Az első irodai hozzáférés az info@diszkertek.hu címhez tartozó, már meglévő, igazolt Auth-fiókhoz kapcsolódik. A jelszó változatlan; jelszót nem kérünk üzenetben, nem tettünk a repositoryba, és nem küldtünk meghívót. A sikeres, valódi jelszavas böngészős belépés még a fiók tulajdonosának ellenőrzésére vár.

Belépés után az iroda munkatársakat vehet nyilvántartásba, és meglévő ERP-munkákhoz megbízásokat oszthat ki. Egy munkatárs felvétele önmagában nem ad belépési fiókot. Az új munkatársak biztonságos fiókhozzárendelése további fejlesztési lépés; névegyezés alapján nem kapcsolunk automatikusan Auth-fiókot. Jelenleg még nincs ERP-munka: a forrásadatok átvétele nem történt meg. Nem tettünk be kitalált munkát vagy ügyfelet a felület kipróbálásához.

## Munkánként változó szerepek

- Választható szerepkör: Csoportvezető, Kertépítési vezető, Résztvevő.
- Egy munkán egyszerre több vezető dolgozhat; egy munkatárs több munkához is tartozhat.
- A kezdőnap és az utolsó nap magyarországi idő szerinti naptári nap. Az utolsó nap teljes egészében beletartozik. Az adatbázis a következő nap kezdetét kizáró felső határként tárolja, a téli/nyári időszámítás figyelembevételével.
- Ugyanannak a személynek ugyanazon munkán ugyanarra a szerepre átfedő aktív megbízás nem rögzíthető.
- A visszavonás azonnal érvényesül, az előzmény és a művelet végzője megmarad. Párhuzamos szerkesztésnél a revízió ellenőrzése megakadályozza a közben megváltozott adat vak felülírását.

Az iroda a saját szervezetén belüli munkatársakat és munkákat kezeli. A nem irodai hozzáférés a saját, éppen érvényes megbízások szerinti munkákra korlátozott. Az ügyfélportál és a címenként pipálható hozzáférés még nem készült el; ennek követelménye változatlanul része a teljes fejlesztésnek.

## Hogyan védjük a régi működést?

A kap projekt csupán a jóváhagyott infrastruktúra helye. A KAP és az Árajánlat tesztalkalmazások üzleti adatait az ERP nem importálja. A Munkalap az elsődleges ügyfélforrás, a Napi feladatok a napi tervezés forrása lesz. A négy éles alkalmazást és a Kassza adatbázisát ez a kiadás nem módosítja.

Az új erp és erp_private sémák saját objektumokat tartalmaznak. A régi public táblák jogosultságai/RLS-beállításai, public szabályai és a nem ERP public/quote_private függvények ellenőrzőlenyomata megegyezett a javítások előtti értékkel. Ez az ellenőrzés a felsorolt objektumok szerkezetét igazolja; nem jelenti a régi alkalmazások teljes felhasználói folyamatainak újratesztelését vagy fizikai erőforrás-elkülönítést.

A közös Auth-beállításokat és a régi Edge Functionöket nem írtuk át. A kijelentkezés scope=local: kizárólag az ERP belépésekor létrejött munkamenetet zárja, nem az összes alkalmazás belépéseit.

## Hitelesítés és adatbázisvédelem

1. A böngésző az erp-gateway saját HTTPS-végpontját hívja. Supabase API-kulcsot nem tartalmaz a frontend; a gateway csak a szerver környezeti anon kulcsát és a tényleges felhasználó JWT-jét használja. Nincs service_role a normál működésben.
2. Bejelentkezés/megújítás után a gateway adatbázisból ellenőrzi az aktív ERP-tagságot. Más tesztalkalmazás Auth-fiókja önmagában nem jogosít ERP-hozzáférésre. A tagság nélküli új munkamenetet helyileg lezárja, és nem adja vissza a tokeneket.
3. Az üzleti kéréseknél Auth-ellenőrzés után kizárólag engedélyezett ERP RPC-t hívhat a felhasználó. A CORS-engedélyezés önmagában nem jogosultságvédelem.
4. Mind a hét ERP-tábla FORCE RLS-t használ. A publikus ERP-függvények szűk NOLOGIN, NOSUPERUSER, NOBYPASSRLS szerephez tartoznak, amely nem a táblák tulajdonosa. Anonim végrehajtás nincs. A szervezet, fiók, aktív személy és megbízás ellenőrzése az adatbázisban történik.
5. Az első felhős próba során a külön adatbázisszerepek nem kaptak tényleges hozzáférést az auth sémához. Az ERP saját request_user_id függvénye ezért a PostgREST által ellenőrzött JWT sub értékét olvassa. Nem felhasználói metaadatból vagy beküldött személyazonosítóból dolgozik, és nem módosítja az auth sémát.
6. A munkatársmentés kérésazonosítót kap. Azonos kérés ismétlése ugyanazt a rekordot adja vissza; azonos azonosító eltérő tartalommal elutasítást kap. A személy, szerep és napló egy tranzakcióban jön létre.

A gateway saját verify_jwt=false beállítása szükséges a belépési kéréshez, amelynek még nincs JWT-je. Ez nem hagyja nyitva az üzleti műveleteket: a handler elvégzi az ellenőrzést, az adatbázis pedig külön érvényesíti a jogosultságot. Más függvény beállítása nem változott.

A tokenek csak memóriában élnek. Oldal-újratöltés, appfrissítés és bezárás után új belépés szükséges. Jelszó és token nem kerül localStorage-ba, sessionStorage-ba vagy service worker gyorsítótárba; API-választ sem tárolunk. Hálózati hiba, lejárt munkamenet, jogosultsági hiba és párhuzamos módosítás magyar visszajelzést kap.

## Telepített források és folytatás

A database/proposals elnevezés az előkészítésből maradt. Az alábbi fájlok a már telepített migrációk megőrzött forrásai; nem futtathatók ismét vakon a már létrehozott objektumokra. A Supabase MCP apply_migration eszköz tranzakciót kezel, ezért az ott átadott SQL-ből a külső begin/commit keret elhagyandó. Új környezetben sorrendjük:

| Supabase-migráció | Megőrzött forrás | Feladat |
| --- | --- | --- |
| 20261030145143 erp_foundation_access | database/proposals/erp-foundation.sql | Hét alaptábla, szervezeti és munkánkénti jogosultságok, első irodai tagság |
| 20261030160403 erp_identity_without_auth_schema_access | database/proposals/erp-identity.sql | JWT-azonosítás auth-sémahozzáférés nélkül |
| 20261030161412 erp_worker_request_deduplication | database/proposals/erp-worker-request.sql | Ismételt munkatársmentés védelme |

A Supabase Auth-fiók nem része a forráskódnak vagy a migrációs adatmentésnek: új környezetben a jóváhagyott irodai fiókot külön létre kell hozni, majd az alapséma név szerinti ellenőrzése kapcsolhatja hozzá a tagságot. Minden új jogosultságot ellenőrizni kell; régi rendszert nem módosíthat az előkészítés.

Gateway-forrás: supabase/functions/erp-gateway/index.ts és handler.ts; saját telepítési beállítás: supabase/config.toml. A szerver a projekt környezeti SUPABASE_URL és SUPABASE_ANON_KEY értékeit használja. Ezeket nem kell a frontendbe másolni. A megengedett webes originek a GitHub Pages domain és a helyi 5194-es előnézet; másik domainre költözéskor ezt célzottan felül kell vizsgálni.

Frontend: src/erp-api.ts (munkamenet/API), src/erp-dates.ts (budapesti dátumok), src/erp-office.ts (felület). Fordítás után a megfelelő assets/js fájlokat is commitolni kell. A kiadás összes verziózott hivatkozását és a service worker előtöltési listáját együtt kell frissíteni.

## Ellenőrzések és fennmaradó korlátok

- TypeScript-build és a gateway szigorú típusellenőrzése.
- 44 sikeres automatikus teszteredmény: 14 PWA; 15 adatbázis-eredmény (14 alteszt és a befoglaló teszt); 8 gateway; 7 API/dátum. A helyi adatbázisteszt eldobható, memóriabeli PGlite környezetet használ; nem az éles adatokat írja.
- A helyi adatbázispróba több szervezetet, időben változó és párhuzamos szerepeket, visszavonást, letiltást, revíziót, naplózást és ismétlésvédelmet ellenőriz. A felhős irodai session/lista SQL-próba sikeres; ez nem helyettesíti a valódi jelszavas HTTP-belépést.
- A telepített gateway HTTP-ellenőrzése: CORS-előkérés 204; belépés nélküli védett kérés 401; hibás adattípusú belépési kérés 400; idegen origin 403. Valós fiókkal nem indítottunk hibás jelszavas próbát.
- A belépési felület 320 és 768 képpont körüli nézetben nem lóg ki; a beviteli mezők és menügombok legalább 48 CSS-képpontosak. Üres belépési űrlapnál a böngésző mezőellenőrzése működik. Konzolhiba nem jelentkezett.
- Az ERP-ben egy szervezet, egy személy és egy hozzárendelt fiók van, nulla munka és nulla megbízás. Nem készült üzleti próbaimport.

A Supabase biztonsági ellenőrzője kilenc, authenticated szereppel hívható ERP SECURITY DEFINER függvényre figyelmeztet. Ezek a szándékosan szűk API-felület részei: saját NOLOGIN/NOBYPASSRLS tulajdonos, üres search_path, adatbázisban ellenőrzött tagság, FORCE RLS és visszavont anonim futtatás mellett. A figyelmeztetés nem lett elhallgatva; a tervezett határt a fenti tesztek igazolják. [Supabase-ellenőrzés leírása](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

A kap projekt meglévő tesztalkalmazásaihoz tartozó figyelmeztetéseket nem változtattuk meg. A megosztott Auth kiszivárgott jelszavak elleni ellenőrzése jelenleg kikapcsolt; ez meglévő projektbeállítás, ebben a lépésben nem módosítottuk. [Jelszóvédelem dokumentációja](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

A további sorrend: saját fiókkal ellenőrzött belépés; az engedélyezett Munkalap/Napi források olvasási és azonosító-megőrzési terve; ellenőrzött ERP-adatátvétel; a PDF további üzleti moduljai. A teljes készültség és az éles átállás nem következik ebből az alapkiadásból.
