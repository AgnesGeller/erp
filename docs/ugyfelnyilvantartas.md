# Ügyfélnyilvántartás – használat és adatkapcsolat

Verzió: 0.1.8 · 2026. november 1.

## Az ügyfelek helye

A Munkalap `munkalap.customers` táblája marad az elsődleges közös ügyféltörzs. Az ERP nem hoz létre ettől független, név alapján másolt ügyféllistát. A forrás UUID-jához egy saját ERP-személy és egy `erp.customer_profiles` kapcsolat tartozik. A címek eredeti UUID-ja és ügyfélkapcsolata megmarad. Azonos név alapján nincs automatikus személyegyesítés.

Az ellenőrzött forrásban 155 ügyfél található: 152 nem archivált és 3 archivált, összesen 157 címmel. 25 nem archivált ügyfélnek nincs címe. Ezek tényleges forrásállapotok; nem az ERP-importból hiányzó rekordok. A 204-es ügyfélszám ebben a forrásban nem igazolódott.

Az ERP a neveket és forrásazonosítókat saját Személyek törzséhez rendeli, a részletes közös ügyféladatokat a forrásból olvassa. A számlázási név/cím kiegészítése és a külön belső megjegyzés saját ERP-adat. Ezek nem írják át a Munkalapot.

## Használat

1. Belépés után **Személyek → Ügyfelek**.
2. Az ügyfélkeresőben legalább két karakter megadásakor automatikusan lenyílnak a találatok, magyar ABC-sorrendben. Ékezet és kisbetű/nagybetű nem számít: például a „maria” megtalálja a „Mária” nevet. Alapból ügyfélnévre keres. A Keresési beállítások alatt külön választható a cím, telefon és e-mail szerinti keresés. A találatok között billentyűzettel is lehet lépkedni.
3. Kiválasztáskor az ügyféladatlap lenyílik. A címek, további kapcsolattartók, megjegyzés és számlázási kiegészítés külön nyitható. Az archivált ügyfelek megjelenítése külön kapcsolható.
4. A **+ Új ügyfél** az új adatlapot nyitja. Kötelező a név, ügyféltípus és munkavégzési cím. Az elérhetőségek, adószám és számlázási kiegészítés külön lenyíló csoportok. Az ügyfél felvétele nem hoz létre belépési fiókot.
5. Az iroda a **Munkatársak és megbízások** alatt lenyíló, ABC-sorrendű munkatársválasztót használhat. A megadott munkatársi névsor saját ERP-adat; a régi appok dolgozói vagy fiókjai nem módosulnak.

## Mit írhat az ERP a közös forrásba?

A megrendelő külön engedélyezte az ERP-ben felvett **új ügyfél és címének** közös listába mentését. Ez adatrögzítés, nem a Munkalap fejlesztése.

A kiszolgáló a négy ügyféltábla adatait olvashatja. Írásként kizárólag új `customers`, `customer_details`, `customer_locations` sorokat szúr be. Nincs PATCH, PUT, DELETE, meglévő sort frissítő upsert, forrás-DDL, új forrástrigger, forrásjogosultság vagy régi munkalap módosítása. A forrás `created_by` értéke üres marad: az ERP másik Auth-projektjének azonosítóját tilos ide írni. A tényleges kezdeményezőt az ERP saját naplója tartalmazza.

Meglévő közös ügyfél nevét, telefonszámát, e-mailjét és címét ebben a kiadásban az ERP nem írja át; ezeket a Munkalapban lehet kezelni. Ugyanilyen nevű új ügyfélnél a mentés ütközést jelez, és nem von össze két embert. Meglévő ügyfélhez új cím hozzáadása a következő, címkezelési lépés része; ebben a kiadásban a meglévő címek olvashatók.

## Ismétlésvédelem és hibakezelés

Az ERP adatbázisa a küldés előtt tartós mentési kérelmet rögzít: `erp_private.customer_requests`. A forrás ügyfél- és címazonosítóját a kiszolgáló egyszer osztja ki. Újrapróbáláskor ugyanazok az azonosítók és eredeti adatok használhatók.

A két projekt közötti három beszúrás nem közös adatbázis-tranzakció. Hálózati hiba után lehet részlegesen létrejött új ügyfél; a felület ilyenkor nem jelez sikeres befejezést. A **Befejezésre váró ügyfélmentések → Mentés folytatása** fejezi be ugyanazt a műveletet, törlés és duplikáció nélkül. Más felületen időközben megváltoztatott forrásrekordot a folytatás sem írhat felül.

Az ERP-kiegészítés mentése verziószámot ellenőriz: két eszköz egymás szerkesztését nem írhatja felül észrevétlenül. A nem mentett űrlapot frissítés, kijelentkezés és ablakbezárás előtt védő figyelmeztetés jelzi.

## Eszközök közötti frissítés

A közös forrás és az ERP-kiegészítések szerveren vannak, nem egyetlen telefonon. Az ERP betöltéskor, előtérbe kerüléskor, kézzel és aktív ügyfélnézetben 30 másodpercenként frissít, ha nincs folyamatban szerkesztés vagy mentés. Internet nélkül nem ígérünk sikeres szinkront. A felület megmutatja az utolsó sikeres frissítés idejét.

A régi Munkalap az új ügyfelet saját következő adatbetöltésekor látja. A már nyitott régi alkalmazás pillanatnyi listája nem változtatható meg az ERP felől: szükség lehet annak saját Frissítés gombjára vagy újranyitására. A régi kód változtatása nélkül nem állítunk minden régi képernyőre azonnali frissítést. A Kassza és Napi feladatok egyezőségét külön, csak olvasással ellenőrizzük.

## Biztonság és továbbfejlesztés

- A felület és az API csak aktív irodai ERP-tagsággal engedi a teljes ügyféllistát. A személy saját fiókja és szerepe szerveroldalon ellenőrzött.
- A két új saját tábla FORCE RLS védelmű. Normál böngészőnek nincs közvetlen táblajoga. A forrást betöltő és a befejezést igazoló RPC csak a kiszolgáló service_role szerepével érhető el, ellenőrzött irodai kezdeményezővel.
- A normál irodai ERP RPC-k tulajdonosa a meglévő, NOLOGIN/NOBYPASSRLS `erp_api`. A Supabase ezek SECURITY DEFINER elérésére figyelmeztet: ez szándékos, szűk, RLS-sel és szervezeti ellenőrzéssel védett API; nem általános táblaelérés. Nem állítjuk, hogy a teljes közös projekt figyelmeztetésmentes.
- A meglévő szerveroldali `KASSZA_SERVICE_ROLE_KEY` a kap infrastruktúrában már rendelkezésre áll. Az ERP saját kiszolgálója használja, nem vesz át KAP/Árajánlat üzleti adatot vagy fiókot. A kulcs technikailag széles jogosultságú, ezért az ERP-kódban rögzített táblák, mezők és HTTP-műveletek ellenőrzése lényeges. Szűkebb forráskulcs kialakítása a forrás jogosultságainak megváltoztatását igényelné; ilyen változás nem történt.
- Kulcs, PIN és hozzáférési token nem kerül a repositoryba. Ügyféladat nem kerül service worker cache-be, dokumentációs képre vagy nyilvános README-be. A böngészőbe csak az aktuális, legfeljebb 30 elemű találati oldal kerül.

Források: `database/proposals/erp-customers.sql`, `erp-staff-directory.sql`; `supabase/functions/erp-gateway/customers.ts`; `src/erp-customers.ts`. A teljes PDF további moduljait ez a kiadás nem helyettesíti.
Ellenőrzés: 95 sikeres automatikus teszteredmény, saját ERP-belépés, tényleges forráslista, adatlap és lapozás, valamint mobilon vízszintes kilógás nélküli megjelenítés. Az új ügyfél beszúrását és hálózati hibából folytatását helyi adatbázissal/API-próbával igazoltuk; éles próbaügyfél nem készült. A megadott kilenc munkatárs saját ERP-rekordja rögzítve, új Auth-fiók nélkül.
