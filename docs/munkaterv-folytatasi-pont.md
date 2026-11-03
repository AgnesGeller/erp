# Munkaterv és négyszintű átvétel – állapot

2026. november 3. **0.7.0 – a jóváhagyott munkatervi fejlesztés elkészült.** [Használati útmutató](munkaterv-es-atvetel.md).

- Dolgozói saját belépés, kézi irodai meghívó/visszaállítás és érvényes munkaszerepek.
- Elfogadott ajánlatból munkafázisok; húzás és mobil fel/le, előfeltételek, idővonal, helyi Visszavonás/Újra és előzményből új változat.
- Négyszintű átvétel, tényleges pipák külön a számított teljesítménytől, személyszínek, 100%-os megosztás és vezetői/irodai zárolás.
- Javítási körök, címzettek, Teendőim, személyes visszaküldési statisztika; helyi fotó és jogosultság szerint szűrt csomag.
- Hálózati újrapróbálás ugyanazzal a kéréssel; helyi függő művelet személyhez kötve, token tárolása nélkül.

## Élesítés és ellenőrzés

Saját ERP-sémák tíz új táblája, FORCE RLS; service_role részére fenntartott üzleti függvények, szerveroldali személy- és projektellenőrzés. A telepítés előtt visszagörgetett éles tranzakciós próba, saját kiszolgáló/azonosítás/jogok helyi mentése. A tulajdonosok, CREATE-jogok és eredeti szereptagságok változatlanok. Gateway v17; a Napi feladatok nyolc személyszíne csak olvasási forrásból, egyértelmű személymegfeleltetéssel átvéve.

271 helyi teszt sikeres; TypeScript és edge ellenőrzés. Böngészőben sorrend/visszavonás/mentés, dolgozói és ügyfélátvétel; mobilon nincs vízszintes kilógás. Éles irodai adatbázis-hozzáférés megmaradt; bejelentkezés nélküli munkaterv elutasítva. A valódi dolgozók meghívását és az első üzleti munkaterv felvitelét az iroda végzi; próbafiók vagy próbaprojekt nem készült élesben.

## Következő fejlesztési egység

A PDF 13. fejezetének nyolc bejegyzéstípusa és kétoldalú változásjóváhagyása, majd a saját ERP-kertépítési munkalap és tényleges munkaidő ötödik sávja. A beszerzés, pénzügy és teljes üzleti lánc további feladatait a [specifikáció állapota](specifikacio-allapot.md) tartalmazza. Ezeket a mostani négy átvételi sáv nem helyettesíti.
