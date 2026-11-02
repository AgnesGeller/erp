# Ügyfélbelépés és kertépítés-követés – telepítési terv

2026. november 2. **Jóváhagyott terv: kézi meghívó és irodai jelszó-visszaállítási ügyintézés. A telepítés ellenőrzött kiadási lépés.** Csak az ERP-t érinti. Követelmény: teljes PDF 3., 11–14. és 21. fejezet, kiegészítés 3. és 5. pont, valamint az irodai címkijelölésről elfogadott egyeztetés.

## Az ügyfél számára

- Ügyfélbelépés az ERP kezdőlapján: saját e-mail-cím és saját jelszó. A személynevet, címet vagy telefonszámot ismerni önmagában nem belépési jogosultság.
- Az iroda hozza létre a hozzáférést, és pipálja be a megengedett munkavégzési címeket. Ugyanaz a fiók több címet, indokolt esetben több külön forrásbeli ügyfélrekordhoz tartozó címet is kaphat; azonos név miatt nincs automatikus összevonás.
- Az ügyfél maga állítja be a jelszavát egyszer használható, lejáró beállító hivatkozással. Nem a KAP vagy bármely más alkalmazás korábbi jelszavát használja.
- Első körben saját, már kiküldött/elfogadott ajánlatának aktuális ügyfélnézetét, PDF-jét, munkáinak tényleges állapotát, egyeztetett dátumát és ügyfélnek szánt eseményeit látja. A piszkozat/irodai előkészítés nem válik automatikusan láthatóvá.
- A későbbi munkaterv, négyszintű átvétel, nyolc bejegyzéstípus és pénzügy ugyanehhez a fiókhoz kapcsolódik. Ezeket nem helyettesíti kitalált készültségi százalék, nulla kifizetés vagy működés nélküli gomb. A teljes PDF megvalósítása továbbra is a teljes projekt része.

## Külön ERP-fiók, közös Supabase-projekt mellett

Az ERP a kap projekt saját erp/erp_private sémáiban marad. Új, kizárólag ERP-s Auth-fiók készül belső, véletlen technikai e-mail-azonosítóval; a valódi kapcsolattartási e-mailt az ERP saját hozzáférési nyilvántartása tárolja. A felületen a valódi e-maillel lehet belépni. Így ugyanaz a valódi e-mail sem kapcsolódik össze egy korábbi tesztalkalmazás fiókjával, és annak jelszava sem változik meg.

A meglévő Ági/Tamás PIN-belépés marad. Más alkalmazás Auth-beállítása, ügyfele, kódja vagy adatbázisobjektuma nem változik. A Munkalap közös ügyféllistáját a hozzáférés létrehozása csak olvassa.

## Öt új, kizárólag ERP-s nyilvántartás

| Objektum | Tartalom és védelem |
| --- | --- |
| erp_private.client_accounts | Szervezet, külön belépő személy, bejelentkezési e-mail, technikai Auth-azonosító, aktív állapot, hitelesítési generáció, revízió; egyedi normalizált belépési e-mail. Jelszót nem tárolunk benne. |
| erp.client_site_access | Fiókhoz kijelölt ügyfél-/címazonosítók, aktív állapot, kiosztó és dátum, revízió. Összetett idegen kulcs az ERP már ellenőrzött munkavégzési címeihez; címek keverése és más szervezethez rendelés tiltott. |
| erp_private.client_setup_links | Csak a véletlen token SHA-256 lenyomata; fiók, meghívás/visszaállítás célja, lejárat, felhasználás, műveleti zárolás. Teljes beállító hivatkozás és jelszó nem kerül naplóba. |
| erp_private.client_sessions | Saját ügyfél-munkamenet azonosítója és hitelesítési generációja, érvényesség/visszavonás. Hozzáférési vagy frissítőtokent nem tárol. Jelszócsere után a régi ERP-ügyfélmunkamenetek nem használhatók újra. |
| erp_private.client_recovery_requests | Jelszó-visszaállítási kérések irodai ügyintézése, időpont, állapot és korlátozás. A nyilvános válasz nem árulja el, létezik-e a megadott fiók. |

A meglévő ERP személy-/szerepkör-/fióktáblákba csak az új ügyfélhez szükséges saját kapcsolatok készülnek. Az ERP saját azonosítási segédje kiegészül az ügyfél-munkamenet ellenőrzésével; az irodai ágat regressziós teszt védi. A közös Supabase Auth globális beállításait nem írjuk át.

## Hozzáférési szabályok

- Szerveroldalon és RLS-ben is: aktív fiók + aktív személy/szerep + engedélyezett saját munkamenet + kijelölt cím. A hivatkozásban vagy kérésben átírt munka-/ajánlatazonosító nem elég a hozzáféréshez.
- Új, kifejezett ügyfélmező-listás lekérdezések és külön PDF-végpont. Belső beszerzési ár, ráhagyás, haszon/jutalék, dolgozói személyes adat, felmérési belső jegyzet, Hasznos információk, teljes audit- vagy árlistadokumentum nem kerül az ügyfél böngészőjébe.
- Kijelölés visszavonása a következő szerverkérésnél érvényes; másik eszközön is. A visszavont címet az újraolvasott felület eltávolítja. Helyi és service-worker gyorsítótárba nem kerül ügyfélajánlat vagy teljes projektadat.
- A megrendelő nem kap irodai/dolgozói megbízást. A négy átvételi szint és a kétoldalú pénzügyi változáskezelés később sem kerülhető meg a portálról.
- Új irodai kiosztás/meghívás/visszavonás naplózott, revízióval védett és ismételhető. Ütközéskor nincs néma felülírás.

## Levélküldési döntés

Javaslat előfizetés és globális SMTP-beállítás módosítása nélkül: az iroda az ERP-ben készíti el a meghívó/beállító hivatkozást, és saját levelezőjével küldi el a címzettnek. Az ügyfél a hivatkozáson maga állítja be a jelszavát. Elfelejtett jelszónál kérést adhat le, amelyet az iroda új egyszer használható hivatkozással intéz. Ez **nem automatikus e-mail-küldés**, és az ügyfél felületén ezt egyértelműen jelezzük.

Ha az ügyfélnek irodai közreműködés nélkül, automatikusan kell kapnia visszaállító levelet, külön ERP-levélküldő szolgáltató és biztonságos szerveroldali kulcs szükséges. Ennek szolgáltatóválasztása és beállítása még nincs jóváhagyva; a korábban kézi küldésre vonatkozó döntés csak az árajánlatokra volt egyértelmű.

## Ellenőrzés és telepítés

1. Helyi migrációpróba szintetikus adatbázisban: iroda, két ügyfél, egy ügyfél több címe, két szervezet; másik ügyfél adata és belső pénzügy tiltott.
2. Meghívó egyszer használható, lejárt hivatkozás, párhuzamos jelszóbeállítás, hibás belépés/korlátozás, visszaállítás, munkamenet-visszavonás, elveszett válasz utáni ismétlés.
3. Kijelölt és letiltott címek, új eszköz, kijelentkezés után késői válasz, mobil/tablet/desktop felület; irodai belépés és 188 meglévő teszt regressziója.
4. Jóváhagyott séma- és jogosultsági változások mentése, külön tranzakciós ERP-migráció és gateway; működési ellenőrzés, majd frontend main commit/push. Automatikus ügyfélmeghívás vagy valódi jelszó beállítása a fejlesztő által nem történik.
5. README rövid állapotfrissítés és részletes használati útmutató. Csak a kipróbált részek jelenthetők késznek. Hibánál az új portál kikapcsolható, a korábbi irodai működés megmarad; létrejött ügyféladatot nem törlünk visszaállításkor.
