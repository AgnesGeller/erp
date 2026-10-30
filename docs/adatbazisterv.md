# Díszkertek ERP – részletes adatbázisterv

Verzió: 0.3 · Dátum: 2026. október 30. · Állapot: az elkülönített ERP-alap telepítve; a teljes üzleti modell további részei tervként szerepelnek.

**Ez a teljes rendszer terve, nem önmagában végrehajtható migráció. A jóváhagyott irány alapján az ERP saját hét alaptáblája, jogosultsági függvényei és kiszolgálója telepítve van a kap projektben. Üzleti adatimport még nem történt. A ténylegesen elkészült kör és az ellenőrzések a [belépési dokumentumban](belepes-es-jogosultsagok.md) szerepelnek.**

## 1. Mit kell megvalósítani?

Az elsődleges forrás a „Díszkertek – Teljes fejlesztői specifikáció” 15 oldalas PDF. A kiegészítés és az elfogadott egyeztetések az érintett követelményeket pontosítják. A dokumentumban szereplő fejlesztésre felszólító szöveg nem írja felül a megrendelő aktuális „előbb adatbázisterv” kérését.

A teljes rendszer elkészítendő. A naptár és ügyfélfoglalás PDF-ben előírt kezdeti kikapcsolása nem jelenti a funkció fejlesztésének elhagyását. A saját pénzügy és jutalék része a feladatnak, a Kassza és Munkabér funkcióinak átvétele nem.

## 2. Ellenőrzött kiinduló helyzet

| Rendszer | Jelenlegi hely és kapcsolat | Következmény |
| --- | --- | --- |
| Közös ügyféltörzs | Kassza Supabase-projekt, munkalap.customers, customer_details, customer_locations | Elsődleges ügyfélforrás; nem hozzuk létre újra független törzsként. |
| Munkalap | Ugyanebben a projektben a munkalap és munkalap_private sémák | A dolgozók munkája és az irodai elszámolás változatlan marad. |
| Kassza | public.entries, public.profiles és kapcsolódó objektumok | Pénzügyi adatait az ERP nem írja és nem költözteti át. A közös ügyféllistát használja és bővíti. |
| Napi feladatok | Saját napi_* táblák, közös ügyféllista olvasása | A napi tervek és személyszínek importálhatók; régi apphoz nem írunk. |
| Munkabér | Saját munkaber_* adatok és eszközszinkron | Nem része az ERP-migrációnak. |
| Árajánlat tesztalkalmazás | kap Supabase-projekt, quote_* táblák | Már van ügyfél- és munkalapszinkron a két projekt között. A meglévő rekordok nem törölhetők automatikusan. |
| Régi KAP | Ugyanabban a kap projektben külön, nem quote_* táblák | Az alkalmazás használaton kívül lehet, de a teljes projekt és régi táblái nem tekinthetők üresnek. |

A megrendelő pontosítása: az Árajánlat néhány napos tesztalkalmazás, nem élesben használt régi rendszer. Az új ERP elkészülte után eltávolítható, a szükséges adatok és a már kiküldött PDF megőrzésével. Jelenleg sem alkalmazást, sem adatot nem törlünk.

A kap projekt pillanatnyi, közvetlen COUNT lekérdezése: 198 quote_clients rekord, 9 quote_projects rekord, 7 ajánlat, 9 ajánlatváltozat, 210 árlistasor. A régi clients táblában 107 rekord, quotes táblában 5 rekord és work_logs táblában 1 rekord van. Ezek állapotfelmérési darabszámok, nem üzleti készültségi minősítések.

A kap adatbázis mérete a vizsgálatkor körülbelül 77 MiB. A kezdeti felméréskor még nem volt erp séma és Storage-bucket. Azóta az ERP saját sémái létrejöttek; fájltárolás ebben a lépésben nem készült. Az üres Storage nem jelenti azt, hogy nincsenek képek: az Árajánlat tesztalkalmazás fájljai eszközönként, IndexedDB-ben lehetnek.

A közös ügyféltörzsben külön ügyfél- és címazonosító van. A címtábla ügyfélazonosítója idegen kulccsal kapcsolódik az ügyfélhez. Egy ügyfélen belül normalizált címre egyediségi szabály van. Az ügyfél normalizált neve jelenleg egyedi: azonos nevű külön személyek esetén ezt a korlátot az ERP nem kerülheti meg és nem oldhatja fel néma összevonással.

A közös ügyfélnév frissítésének jelenlegi triggere a kapcsolt régi munkalapokon és elszámolásokon is frissíti a nevet. Ez tényleges éles adathatás, ezért a későbbi ERP ügyfélmentése külön szabályozott adatkapcsolat lesz.

## 3. Elhelyezési lehetőségek

| Lehetőség | Előny | Hátrány | Terv |
| --- | --- | --- | --- |
| Új ERP-séma a Kassza projektben | A közös törzs helyben van | Ugyanaz az Auth és erőforráskörnyezet szolgálná a dolgozókat és új megrendelőket. A jelenlegi ügyfélolvasási RLS nem megfelelő általános ügyfélbelépéshez. | Nem javasolt. |
| Új ERP-séma a meglévő kap projektben | Nincs szükség harmadik fizetős projektre; a Kassza Auth-környezetét nem bővíti ügyfélfiókokkal | A kap erőforrásai és Auth-szolgáltatása közös marad a friss Árajánlat tesztalkalmazással. Teljes izolációs teszt szükséges. | A megrendelő által jóváhagyott irány. |
| Külön harmadik felhős projekt | Erősebb fizikai elkülönítés | A jelenlegi két Free projekt mellett új költség merülhet fel | Előfizetés nélkül most nem választjuk. |
| Külön helyi Supabase | A fejlesztés nem terheli az éles adatbázist | Helyi futtatókörnyezet szükséges; nem telefonról elérhető éles szolgáltatás | Fejlesztési és migrációs próbakörnyezetnek javasolt. |

**Javaslat:** helyi, elkülönített fejlesztés; jóváhagyás és tesztek után az ERP saját objektumai a meglévő kap projektben. A Kassza projekt közös ügyféltörzse megmarad. Ez két fizikai Supabase-projekt, egyetlen ERP-felület és egyetlen elsődleges közös ügyfélforrás.

Nem nevezünk át és nem törlünk projektet, nem módosítunk meglévő táblát, triggert, régi RLS-szabályt vagy régi függvényt. A kap projekten belüli új, elkülönített ERP-objektumok irányát a megrendelő jóváhagyta. Telepítésük előtt a teszteknek igazolniuk kell az izolációt és a meglévő működés változatlanságát. Az előfizetés nélküliség nem jelenti korlátlan tárhely vagy teljes szolgáltatási elkülönítés ígéretét.

## 4. Fizikai és biztonsági határok

- erp: az új alkalmazás relációs üzleti táblái. Alapértelmezésben nincs közvetlen anonim vagy authenticated táblajog.
- erp_private: szinkronállapot, műveleti sor, jogosultsági segédadatok, belső számlálók. Nem publikált séma.
- public.erp_*: kizárólag új nevű, hitelesített REST/RPC belépési függvények. Régi funkciónevet nem írunk felül. A publikált sémák meglévő listáját nem kell emiatt átállítani.
- erp-* Edge Functions: kizárólag új függvénynevek meghíváshoz, e-mailhez, médiához, MI-hez és ellenőrzött szinkronhoz.
- erp-media privát Storage-bucket: új ERP-fájlok; nem nyilvános képtár.
- Helyi fejlesztőkörnyezet: a forrásrendszer írási titkai nélkül működik, tesztadatokat és engedélyezett másolatokat használ.

A publikus RPC-k tulajdonosa elkülönített, nem táblatulajdonos, NOLOGIN és NOBYPASSRLS ERP-szerep legyen, csak a szükséges ERP-jogokkal. SECURITY DEFINER használata itt csak ehhez a szűk szerephez kötötten jöhet szóba: nem postgres/service_role tulajdonosként. Az ERP-táblákon RLS, szükség szerint FORCE RLS, rögzített search_path és teljesen minősített objektumnevek szükségesek. A PUBLIC és anon alapértelmezett függvényfuttatási joga minden új RPC-n visszavonandó; az authenticated szerep csak a kifejezetten engedélyezett belépési függvényeket hívhatja.

Ezt az elrendezést helyi jogosultsági tesztnek kell igazolnia, beleértve a Supabase-ben létrehozható egyedi adatbázisszerepek pontos jogosultságait. Nem tekinthető kész védelemnek pusztán attól, hogy a séma neve eltérő.

A normál ERP-műveletekhez nem használunk általános service_role kulcsot. Az RPC megőrzi a hitelesített felhasználó JWT-környezetét, a PostgREST által ellenőrzött JWT sub mezőjéből azonosít (az ERP saját request_user_id segédfüggvényével, auth-sémamódosítás nélkül), és ellenőrzi az ERP-fiókot, szervezetet, aktív szerepet és az érintett munkát. Az aktív szerep csak a valóban kiosztott szerepek közül választható. A kliens által küldött személyazonosító nem bizonyíték.

A kap Auth jelenlegi vizsgálatakor nem volt automatikus auth.users trigger. Az új ERP-fiókhoz nem hozunk létre public.profiles vagy quote_staff tagságot: ezek régi appok hozzáférési táblái. A teljes meglévő API- és RLS-felület izolációját a telepítés előtt külön teszteljük; az eddigi részleges vizsgálat nem teljes biztonsági tanúsítás.

## 5. Közös adattípusok és szabályok

- Belső kulcs: UUID. Az ügyfélbarát sorszám ettől külön, tranzakcióbiztos számlálóból keletkezik.
- Szervezet: kezdetben egy Díszkertek-szervezet; az üzleti táblák organization_id-t tárolnak. Összetett idegen kulcsok akadályozzák a külön szervezetek közötti kapcsolatot.
- Egyes forrásrendszerek kulcsai másik projektben vannak: oda nem hozható valódi helyi idegen kulcs. Ezeket source_system + source_id, egyediségi szabály és egyeztető folyamat ellenőrzi.
- Időbélyegek: timestamptz, megjelenítés Europe/Budapest szerint. Munkanap és teljesítési nap: date.
- Munkaidő: egész emberperc. Mennyiség és egységár: rögzített pontosságú numeric; nem lebegőpontos pénzszámítás.
- Egységár például numeric(18,6), elszámolási összeg numeric(18,2). A végső forintkerekítés és ÁFA-sorrend egy közös, tesztelt szabály része.
- Minden módosítható rekordnak revision és updated_at mezője van. Elavult változatra küldött mentést a szerver elutasít.
- Kritikus műveletnél request_id egyediség gondoskodik arról, hogy az újrapróbálás ne jelentsen új befizetést, jóváhagyást vagy készletmozgást.
- Elfogadott történeti állomány nem írható át. A javítás új változat vagy korrekciós esemény.
- Üzleti és pénzügyi törlés jellemzően archiválás; történeti napló és éves jutalék nem törlődhet láncoltan.

## 6. Teljes logikai adatmodell

A táblanevek tervnevek; jóváhagyás után a migrációkban véglegesítendők. A külön táblák üzleti fogalmakat választanak el, nem különálló alkalmazásokat.

| Modul / PDF-fejezet | Tervezett táblák | Fő kapcsolatok és megőrzési szabály |
| --- | --- | --- |
| Alapok, 2–6. | organizations, persons, user_accounts, person_roles, invitations, person_colors, person_private_details | Egy személy több szerepet kaphat; ügyfél bejelentkezés nélkül is létezhet. Érzékeny adat külön, szűk hozzáférésű táblában. |
| Közös ügyfél | customer_links, locations, location_links, client_billing_profiles, source_mappings | Személy → több cím → több munka. A shared customer/location UUID megmarad; a számlázási cím külön fogalom. |
| Felmérés, 7. | surveys, survey_sections, survey_notes, survey_media, survey_audio_jobs | Ügyfél + cím → több felmérés. Eredeti jegyzet és MI-változat külön, képek főtételhez köthetők. |
| Árlista, 8. | categories, item_types, type_parameters, formula_versions, pricing_components, pricing_minima, catalog_imports, catalog_import_rows | Kategória → Típus; forrássor és módosítási előzmény megmarad. Nincs tetszőleges kódot futtató képlet. |
| Sablon, 9. | templates, template_versions, template_items, template_parameters, template_phases | Sablonverzió → főtételek és sorok. Ajánlatba másolt pillanatkép, nem élő árlista-hivatkozás. |
| Anyag, 10. | materials, vendors, material_boms, material_waste_rules, material_packaging_rules | Típus → több anyag. Beépítendő és beszerzendő mennyiség külön. |
| Ajánlat, 11–12. | quotes, quote_versions, quote_main_items, quote_lines, quote_line_materials, quote_info_templates, quote_info_blocks, quote_email_jobs, quote_email_events | Felmérés opcionális; ajánlatverzió tartalmazza az akkori árat, ÁFÁ-t, óradíjat és képletszabályt. |
| Kertépítés, 12–15. | garden_projects, project_participants, project_tasks, task_dependencies, task_acceptance_events, task_rejection_events, task_credit_shares, credit_share_revisions, task_effective_progress | Elfogadott ajánlatból külön indítandó munka. Valós esemény és számított előrehaladás külön. |
| Bejegyzés és változás, 13. | project_posts, post_media, change_requests, change_request_lines, change_approvals, defect_cases, defect_events, damage_claims, damage_decisions | Mind a nyolc típus kezelhető. Pénzügyi változás csak szükséges kétoldalú jóváhagyás után hatályos. |
| Beszerzés, 10. és 15. | purchase_plans, purchase_orders, purchase_order_lines, material_lots, material_movements, material_extra_requests | Részszállítás, telephely, helyszín, beépítés és fel nem használt állomány külön. |
| Kertépítési munkaidő, 15. | construction_timesheets, timesheet_workers, timesheet_task_links, project_time_budget_revisions | Személyenként eltérő érkezés/távozás; a teljes emberperc egyszer szerepel az ötödik sávban. |
| Saját pénzügy, 16–17. | receivables, settlement_documents, settlement_lines, payment_intents, payment_requests, payment_claims, payment_confirmations, payment_allocations, client_advances, financial_adjustments, project_cost_documents, project_cost_lines | Elszámolható munka, befizetés és befizetésfelosztás külön. Nem a Kassza másolata. |
| Jutalék, 16. | project_result_snapshots, commission_project_revisions, commission_person_shares, annual_commission_ledger, commission_payouts | Pozitív és negatív eredmény; éves összesítés; projektarchiválás nem törli. |
| Karbantartás, 18. | maintenance_orders, maintenance_lines, maintenance_worksheets, maintenance_worksheet_versions, maintenance_worksheet_workers | A munkalap címhez és ügyfélhez kötött. Árakat az iroda kezeli, az Egyéb sor külön vezetői kivétel. |
| Naptár és napi feladatok, 19. | calendar_entries, calendar_assignments, capacity_blocks, recurring_blocks, booking_requests, daily_plans, daily_work_items, vehicles, tools, daily_templates | Teljes funkció és adatimport. Online foglalás, dolgozói nézet és irodai nézet külön kapcsolható. |
| Referencia, 20. | references, reference_media, reference_channel_drafts, reference_consents, wordpress_sync_jobs, wordpress_sync_records | A felmérés és ténylegesen elfogadott munka alapján készül. WP-piszkozat és publikálás külön. |
| Közös infrastruktúra, 5. és 21. | todos, notifications, notification_reads, push_subscriptions, audit_events, media_assets, media_links, media_deletion_jobs, feature_flags, settings_versions | Projektenként csoportosított teendők, tartós értesítési előzmény, szerepkörfüggő média. |
| Belső infrastruktúra | erp_private.sync_outbox, sync_inbox, sync_checkpoints, sync_leases, idempotency_keys, import_runs, import_items, deletion_jobs | Műveleti sor, ismétlésvédelem, próbaimport és visszaellenőrzés. Nem publikus ügyféladatforrás. |

## 7. Egy személy, több cím, több munka

A közös ügyfél UUID-ja a customer_links táblában unique(source_system, source_customer_id) kapcsolattal jelenik meg. A címtábla külön location_links megfeleltetést kap, a forrás címazonosítójával.

Az ERP ügyfélmásolata szinkronizált, jogosultsággal szűrt helyi vetület, nem második szerkesztési igazságforrás. Az ERP-specifikus dolgozói adatok, szerepek, számlázási profilok és meghívások saját adatok.

A munka az ügyfélre ÉS a konkrét címre hivatkozik. Az elszámolás és a befizetés kiosztása konkrét munkákhoz és elszámolási sorokhoz kötődik. Ügyfél szerinti összesítés és cím szerinti bontás is készíthető.

A név és cím megjelenítése a listában ismétlődhet. Ez nem jelenti, hogy ugyanazt a személyt újra létre kell hozni. Egyező név önmagában nem elegendő összevonáshoz. A már kiküldött ajánlatok ügyfél- és címpillanatképe megmarad.

## 8. Az ügyfélszinkron részletes folyamata

### Források és irányok

- Munkalap/Kassza közös törzs → ERP: név, ügyféltípus, kapcsolattartó, e-mail, telefon, adószám, közös megjegyzés, aktív állapot és címek.
- ERP iroda → közös törzs: jóváhagyott új ügyfél vagy engedélyezett közös mezőmódosítás.
- ERP saját számlázási cím, szerepek, projekt-hozzárendelések és belső pénzügy → kizárólag ERP.
- Régi Árajánlat ↔ közös törzs: a meglévő kapcsolat változatlan; az ERP nem ír közvetlenül quote_clients rekordokat.
- ERP → Kassza-bevételek / Munkabér: nincs automatikus könyvelés vagy bérszinkron.

A fejlesztési környezetnek nincs forrásíró kapcsolata. Az éles kétirányú ügyfélszinkron csak jóváhagyott átálláskor kapcsolható be.

### Mentési és újrapróbálási szabály

1. A szerver azonosítja a felhasználót, ellenőrzi az iroda szerepet és a mentett rekord verzióját.
2. Egy helyi tranzakció rögzíti a módosítási szándékot, az eredeti mezőértékeket és a request_id-t az outboxban.
3. A külön erp-customer-sync híd beolvassa a közös forrás legfrissebb állapotát.
4. Mezőnként összehasonlítja a régi alapot, a helyi kérést és a friss forrást. Független mezők módosításai összeilleszthetők; azonos mező eltérő módosításánál irodai feloldás szükséges.
5. A forrásba csak az engedélyezett mezők kerülhetnek, updated_at feltétellel. Név szerinti találatnál nincs automatikus személyegyesítés.
6. Az ERP a ténylegesen visszaolvasott forrásállapotot menti szinkronizált vetületként. A felület csak ezután jelez „Közös ügyféllistával szinkronban” állapotot.
7. Hálózati hiba esetén a kérés megmarad, jelzett várakozó állapottal és ismétlésvédelemmel.

A két külön adatbázis között nincs közös tranzakció. A customers, customer_details és customer_locations írása részlépésekben történhet. Minden sikeres részlépés naplózott; hiba után a következő futás visszaolvasással folytatja, nem ismétli vakon és nem görget vissza más által közben módosított adatot. Azonos új ügyfél létrehozásának ismétlése stabil forrás-UUID-val nem hozhat létre második rekordot.

A kap Auth felhasználói UUID-ja nem írható a Kassza-projekt created_by mezőjébe: az ottani idegen kulcs másik Auth-állományra mutat. Az ERP valódi kezdeményezőjét saját audit tárolja. A forrás létrehozójához csak hiteles, jóváhagyott megfeleltetés használható, vagy a jelenleg nullable forrásmező üres marad; más dolgozót nem tüntetünk fel kezdeményezőként.

### Hozzáférés a közös forráshoz

A böngésző nem kap Kassza-adatbáziskulcsot, vezetői PIN-t vagy szolgáltatási titkot. A híd kizárólag szerveroldalon működik. A jelenlegi Árajánlat hídja már használ ilyen szerveroldali forráskapcsolatot, de az ERP új függvénye külön hitelesítést és szűk mezőengedélylistát kap.

Hosszú távon a legkisebb jogosultságú forráshozzáférés előnyös. Ennek kialakítása új forrásjogosultságot igényelhet; ezt nem végezzük el hallgatólagosan. Ha a meglévő, tágabb szerveroldali kulcs használata marad a jóváhagyott út, ezt dokumentált kockázatként kell kezelni. A híd kódja nem írhat pénzügyi, munkabér-, munkalap- vagy jogosultsági mezőt.

### Frissítés és törlésészlelés

A forrás három táblájának külön frissítési ideje van, ezért külön checkpoint szükséges. A lekérés lapozott, stabil updated_at + id sorrenddel és átfedő időablakkal történik. Az archiválás és inaktív állapot beérkezik. A teljes egyeztető olvasás a fizikailag eltűnt rekordokat is észleli; ERP-ből fizikai forrástörlés nem történik.

Tervezett frissítés: belépéskor, mentéskor, előtérbe kerüléskor, kézzel és látható ablakban időszakosan. Új, kizárólag ERP-nevű időzített feladat csak kvóta- és terhelésvizsgálat után. Nem ígérünk azonnali kétprojekt-szinkront; a felület mutatja az utolsó sikeres egyeztetést és a függő módosításokat.

## 9. Jogosultságok és adatnézetek

| Szerep | Működés |
| --- | --- |
| Iroda | Teljes ERP-adminisztráció, személyek, árak, pénzügy, jutalék, jogosultságkiosztás. |
| Építésvezető | A kertépítési munkaterület PDF szerinti vezetői jogosultságai. |
| Karbantartásvezető | A karbantartási munkaterület PDF szerinti vezetői jogosultságai. |
| Kertépítő / Kertész | Azonos operatív engedélyek, mindkét munkaterületen dolgozhatnak; pénzügyi és beszerzési ár nélkül. |
| Megrendelő | Kizárólag a hozzárendelt saját munkák, ügyfélárak és befizetési adatok; más ügyfél, belső költség, jutalék és Hasznos információk kizárva. |

A megrendelőnél az ERP-fiók → személy → ügyfél → munka kapcsolat szerveroldalon ellenőrzendő. Egy e-mail-egyezés nem ad automatikus ügyfélhozzáférést.

A műszaki, ügyfélár-, belső beszerzési ár- és jutalékadatok külön táblákba vagy ellenőrzött vetületekbe kerülnek. A jogosultság nem pusztán sorolvasási kérdés: a visszaadott oszlopok és JSON-mezők is szerepfüggők.

A projektcsatlakozás, kilépés és irodai hozzárendelés megőrzi az előzményeket. Kilépés után nem küldünk új projektpush-t korábbi részvétel alapján. A korábbi teljesítmény és napló nem tűnik el.

## 10. Számítási motor és ajánlatverziók

Az új Excel a kalkuláció és induló sablonok elsődleges adatforrása. Ellenőrzött: 163 árlistasor, 22 kategória; 144 típusnál nincs második mértékegység, 19-nél van. A szorzási logikát és az anyag/munkadíj szétválasztását megőrizzük, majd a PDF képleteivel bővítjük.

A program nem veszi át a forrás Excel hibát nullára csendesítő IFERROR viselkedését végleges ajánlatnál. Hiányzó ár vagy szükséges mennyiség jelzett, véglegesítést tiltó adatállapot.

A képletszabályok verziózott, engedélyezett műveletekből álló leírások. Nincs eval, tetszőleges JavaScript vagy SQL a képletmezőben. Egységellenőrzés kötelező: m² nem kerülhet fm helyére; cm → m konverzió explicit.

A mennyiségek öröklése, rétegvastagság, növénysűrűség, komponens- és tételminimum, ráhagyás és csomagkerekítés külön szabály. Kézi felülírás megőrzi a kiinduló értéket és az indokot. A számítás serveroldalon is ellenőrzött.

Az ajánlat minden végleges változata az akkori árat, képletet, mennyiséget, ÁFA-alapot, óradíjat, szöveget és szükséges médiaazonosítókat tárolja. A törzs későbbi szerkesztése nem módosítja. A 8 500 Ft/főóra kalkulációs díj, nem dolgozói bér; nettó/bruttó alapját explicit jelölni és a bevezetés előtt egyeztetni kell, nem szabad eltérő áralapokat keverni.

Az ajánlatküldéshez tartós e-mail job és szolgáltatói eredmény tartozik. A mailto ablak megnyitása nem kézbesítési igazolás. Küldési retry nem generálhat észrevétlenül ismételt levelet; bizonytalan szolgáltatói válasznál egyeztetési állapot kell.

## 11. Jóváhagyások, idő és anyagmozgás

A négy valódi átvételi szint eseményeit külön tároljuk. A magasabb átvételből örökölt előrehaladás számított érték, nem hamis alsóbb pipa. Visszaküldés invalidálja az érintett hatályos jóváhagyást, és újraszámolja a sávot, személyszíneket és statisztikát.

A teljesítmény fázisonként legfeljebb egyszer számít a projektbe. A személyek arányai összesen 100%-ot adnak; módosításkor az érintett fázist tranzakcióban zároljuk. A kiosztási jogosultsági szint és a tényleges gombnyomó külön adat. Feladatfüggőségi kör nem menthető.

Az ötödik sáv a munkalapokból összegzett tényleges emberperc és tervperc aránya, 100% fölé is mehet. Átfedő személyes munkalap figyelmeztetést ad; az időkeret módosítása nem módosítja az ügyfélárat, eredeti és módosított terv megmarad.

Az anyagmozgás tétel- és szállítmányalapú. Külön esemény a megrendelés, telephelyre érkezés, átvétel, helyszínre szállítás, beépítés, visszavétel és korrekció. Egy esemény ismétlése nem duplázhat készletet. Az elmozdított mennyiség nem haladhatja meg a rendelkezésre állót; részátvétel maradékot hagy.

A 100/70/0 belső költségszabály egymást kizáró mennyiségrészekre vonatkozik: beépített; helyszínen, még nem beépített; helyszínre nem szállított. A beépített tétel nem számíthat még egyszer 70%-kal. Szabályverziót és beszerzési egységárat rögzítünk a történeti elszámoláshoz.

## 12. Saját pénzügy és jutalék

Három külön kimutatási fogalom:
1. Elvégzett és elszámolható munkák ügyfélértéke.
2. Igazolt tényleges befizetések, előlegek és kintlévőségek.
3. Projekt belső eredménye és éves jutalékanalitikája.

A költségvetési Excel alapelve szerint a munka értéke már akkor is szerepelhet az elszámolási kimutatásban, amikor még nincs kifizetve. A befizetés ezt nem növeli újra bevételként, hanem kiegyenlíti a követelést.

A kertépítési sor elszámolhatóságát a PDF szerinti megrendelői átvétel határozza meg. Fizetési szándék, vezetői készpénzátvételi jelzés és irodai visszaigazolt befizetés külön rekord. Átutalást vezető nem igazolhat készpénzként.

A befizetés módja, összege, átvételi/banki dátuma és felelőse megmarad. Egy befizetés több elszámolásra felosztható, egy elszámolás részletekben fizethető. A kiosztott összeg nem haladhatja meg az igazolt befizetést; a fennmaradó rész előleg. A módosítás tranzakcióban zárolja az érintett befizetést és elszámolásokat.

Az ERP nem hoz létre public.entries Kassza-tételt. A külön Kasszában az átvevő dolgozó vagy Tamás változatlanul rögzíti a tényleges bevételt. Az ERP saját visszaigazolása nem adódhat hozzá második bevételként ugyanannak a kimutatásnak a készítésekor. A munkatársak közötti pénzátadás nem céges bevétel/költség.

A saját projektköltség-nyilvántartás számlaadatot és anyagköltséget fogadhat, de a Kassza és Munkabér adatait nem importálja automatikusan. A PDF szerinti kalkulációs óradíjas munkaeredmény nem számviteli, bér- vagy adókönyvelés.

Éves jutalék: a pozitív és negatív projekthozzájárulás részesedésarányos tételekből épül. A képlet változata, eredménypillanatkép, személyes arány és elszámolási év megmarad. Évváltás nem görgeti át az előző év negatív értékét. Korrekció új tétel, nem történeti átírás. Évközi jutalékelőleg nincs. Negatív analitikai egyenlegből nem keletkezik automatikus munkabérlevonás.

## 13. Fájlok, offline működés és referencia

Minden fájlhoz media_assets rekord tartozik: tulajdonos, kapcsolt munka/felmérés, MIME-típus, méret, ellenőrzőösszeg, privát tárolókulcs, feltöltési és törlési állapot. A kliens által megadott MIME önmagában nem ellenőrzés. Képoptimalizálás, EXIF-helyadatkezelés és jogosult rövid életű letöltés szükséges.

A privát Storage-hozzáférés ERP-személyhez és munkához kötött. A média-API sem adhat ki belső fájlt ügyfélnek. Új bucket és csak arra vonatkozó szabály hozható létre; régi storage-szabályt nem írunk át.

Offline IndexedDB: személyenként elválasztott vázlatok és műveleti sor. Kijelentkezés és szerepváltás kezeli a gyorsítótárat; más ügyfél és belső ár nem maradhat jogosulatlanul olvasható. A böngészőhelyi tárolás nem jelent önmagában titkosítást. A kulcs- és eszközvédelmi megoldást külön ellenőrizni kell.

Helyi mentés és szerverre szinkronizált mentés eltérő állapot. Jóváhagyás, fizetés, szerepkörváltás, ajánlatküldés és publikálás csak szerverigazolás után végleges. A kliens nem játszhat újra elavult jogosultsággal függő pénzügyi műveletet.

Hangot csak a sikeresen feldolgozott és tartósan mentett eredmény után törölhet a rendszer. Fotó nem törlődik automatikusan idő alapján. A projektképek törlése nem törli a pénzügyet és jutalékot.

Referenciához külön szöveg- és médiaváltozat készül webre, Facebookra és Instagramra. A WordPress feltöltés először piszkozat; a publikálás külön iroda művelet. A külső WP-azonosító és szinkronhiba megmarad. A referencia kizárólag a hozzájárulással közzétehető tartalmat és valóban elvégzett munkát használja.

## 14. Migráció és átállás

1. Séma-, függvény-, jogosultság- és forrásverzió-leltár rögzítése, kizárólag olvasással.
2. Ellenőrzött, hozzáférésvédett adatmentés; titkos vagy személyes adat nem kerül GitHubra.
3. Helyi ERP és forrásmásolat: sem cron, sem e-mail/push/WordPress-küldés, sem eredeti forrásírás nem futhat a másolaton.
4. Stabil azonosítós próbaimport: ügyfelek, összes cím és állapot; felmérések/ajánlatok; árak és sablonok; munkalapok és elszámoláskapcsolatok; napi tervek és színek.
5. A forrásban szereplő, de nem adatbázisban tárolt helyi képek/PDF-ek külön eszközexportból vehetők át. Ezek meglétét nem feltételezzük.
6. Rekordszám, azonosítók, kapcsolatok, mennyiségek, árak, befizetések, státuszok és történeti előzmények egyeztetése. Egy névegyezés vagy összegazonosság nem bizonyít teljes migrációt.
7. Átállás előtt friss deltaimport minden érintett forrástáblából; a kiválasztott modulok rögzítési szünete csak előre egyeztetve.
8. Az utolsó import kezdő- és záróállapota, függő szinkronok és offline vázlatok ellenőrzése. Nyitott forrás-vázlatot nem szabad elveszettnek vagy átvettnek tekinteni.
9. Külön jóváhagyott élesítés, fokozatos felhasználói bekapcsolás, megfigyelés.
10. Visszaállási terv: ERP-írás megállítása, ERP-ben keletkezett új adatok megőrzése/exportja, régi rögzítés biztonságos folytatása és az új adatok egyeztetett visszavezetése. A visszaállás nem merülhet ki egy korábbi adatbázis vak visszatöltésében.

A régi appok nem kapcsolhatók ki a bizonyított adat- és működési megfelelőség előtt. Kassza és Munkabér működését az ERP átállása sem szakíthatja meg.

## 15. Indexek, terhelés és ingyenes keret

Fő indexek: szervezet + ügyfél/cím; munka + státusz; felhasználó + nyitott teendő + idő; forrásrendszer + forrásazonosító; source_updated_at + id; outbox állapot + következő próbálkozás; éves jutalék személy + év; munka + eseményidő. A pontos indexeket tényleges lekérdezések alapján választjuk.

Listák lapozva töltődnek; nincs teljes adatbázis-kliensletöltés. A sávok és statisztikák eseményekből számolhatók, szükség szerint ellenőrzött, újraépíthető vetületekkel. Nem terheljük az éles forrást másodpercenkénti teljes újraolvasással.

Free csomag esetén nincs korlátlan fotó- vagy adatmegőrzésre elegendő tárhelyígéret. Automatikus képtörléssel nem kerülhetjük meg a PDF megőrzési szabályát. Mérni kell a tárhelyet és forgalmat, és kvóta előtt exportálható, ellenőrzött mentést biztosítani. Költségjóváhagyás nélkül nem váltunk csomagot és nem aktiválunk fizetős szolgáltatást.

A helyi Supabase futtatási feltételeit (CLI és konténeres környezet) még ellenőrizni kell, telepítés eddig nem történt.

## 16. Követelmény-megfeleltetés és elfogadás

| PDF-rész | Ellenőrizendő adatbázis-viselkedés |
| --- | --- |
| 0–6. | Egységes személytörzs, több szerep, meghívó/jelszó-visszaállítás, címek, saját teendők, projektcsatlakozás. |
| 7–10. | Offline felmérés, eredeti és MI-jegyzet, paraméteres számítás, sablonpillanatkép, külön beszerzési mennyiség és részszállítás. |
| 11–13. | Két PDF-nézet megfelelő adatokkal, igazolt e-mailküldés, külön projektindítás, mind a nyolc bejegyzéstípus, kétoldalú pénzügyi jóváhagyás. |
| 14–16. | Feladatfüggőségek, négy valós átvételi szint, örökölt progress, 100%-os személymegosztás, ötödik idősáv, 100/70/0 anyageredmény, éves jutalék. |
| 17–18. | Átvétel és fizetés külön, előleg/részfizetés, irodai visszaigazolás, karbantartási ár- és Egyéb-szabály, ügyfélnek közzétett munkalap. |
| 19–20. | Teljes naptár/napi adatimport, szerepkörkapcsolók, 1+1 óra kapacitáspuffer, referencia és valódi WP-piszkozatszinkron. |
| 21–23. | Privát média, offline sor, audit, törlés és megőrzés, titokkezelés, stabil azonosítók, ügyféladatok elkülönítése. |
| 24–27. | Minden mérföldkő ellenőrizhető, a PDF 25. fejezetének mind a 28 elfogadási forgatókönyve teljesítendő, dokumentált átadás. |

Kiegészítő kötelező tesztek:
- ERP-megrendelő a kap régi clients/quotes és quote_* adatait sem olvashatja.
- Régi Árajánlat-fiók ERP-tagság nélkül nem kap ERP-hozzáférést.
- Két megrendelő egymás ügyfeleit, képeit, pénzügyeit és offline adatait nem láthatja.
- Új ERP-migráció nem változtat meglévő sémaobjektumok definícióján vagy jogaiban.
- A forrásszinkron retry, két kliens, részleges hiba, elavult frissítés és azonos név esetén sem dupláz vagy ír felül csendben.
- Két címhez tartozó munka és fizetés nem keverhető össze.
- Dupla kattintás, offline újraküldés és párhuzamos jóváhagyás nem könyvel kétszer.
- Mentés és visszaállítás valós helyi próbával ellenőrzött.
- A régi appok belépése, ügyfélválasztása, mentése és összesítése az átállás előtt/után változatlan eredményt ad.

## 17. Még nyitott, valóban szükséges döntések

1. Lezárt döntés: a megrendelő jóváhagyta a kap projekten belüli elkülönített ERP-sémák irányát. Az első Iroda-fiók címe info@diszkertek.hu; létrehozás és meghívóküldés még nem történt.
2. A kiegészítés nálunk a „Munkalapok alkalmazás” címnél megszakad. A hiányzó folytatás további követelményeket tartalmazhat.
3. A Járda építés sablon öt általános megnevezését mely pontos Excel-árlistatípusokkal és milyen rétegrenddel kell összerendelni? A felmérés külön dokumentumban található.
4. MI-, e-mail- és WordPress-hozzáférések és költségkeret: a PDF teljes funkcionalitásához tényleges végpont szükséges. Az „előfizetés nélkül” nem jelent automatikusan engedélyt alkalmankénti API-díjra. Jóváhagyás nélkül díjas kérést sem indítunk.
5. A meghívók és automatikus levelek küldéséhez a meglévő domain postafiókjának technikai küldési lehetőségét fel kell mérni. Jelszó/titok nem kerülhet chatbe vagy repositoryba.
6. A PDF szerinti kalkulációs óradíj nettó/bruttó alapját az Excel és ajánlatadatok összevetésekor véglegesíteni kell.

A naptár alapértelmezett szerepkörkapcsolóit a PDF szerint értelmezzük: iroda számára elérhető, dolgozói naptár és megrendelői foglalás kezdetben kikapcsolva, de megvalósított funkcióval. Ezen változtatni csak külön utasításra szabad.

## 18. Források és bizonyíték

- Díszkertek – Teljes fejlesztői specifikáció, 1.0, 2026. október 29., 15 oldal; teljes újraolvasás.
- Fejlesztési specifikáció kiegészítése; a kapott példány a Munkalapok alcímnél véget ér.
- A megrendelő jelen beszélgetésben jóváhagyott arculati, technológiai, adatvédelmi és működési pontosításai.
- Árajánlat kalkulátor.xlsx: Kalkulátor, Adatbázis, Részletező, Minták lapok; csak olvasási vizsgálat.
- Költségvetés 2026.xlsx: a munkaérték, fizetési állapot és költségek elkülönítése; nem teljes számviteli audit.
- Közvetlen Supabase SELECT-lekérdezések: struktúrák, RLS, triggerek, Auth-trigger hiánya, kapcsolatok és darabszámok; adatírás nélkül.
- A korábbi appok forrásának célzott olvasása, köztük quote-customer-sync, munkalap-data és a Kassza-leválasztó SQL.
- Supabase: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase: https://supabase.com/docs/guides/database/functions
- Supabase: https://supabase.com/docs/guides/platform/billing-on-supabase

A terv nem bizonyítja a majdani rendszer működését. A teljes alkalmazás, migráció és végpontok készültségét kizárólag végrehajtott, dokumentált tesztek igazolhatják.


## Megvalósult alap a 0.1.4 kiadásban

Az organizations, persons, user_accounts, person_roles, garden_projects, project_assignments és audit_events táblák létrejöttek. Mindegyiken FORCE RLS védi az adatokat. A szervezeti tagságot és a munkánkénti szerepeket az adatbázis ellenőrzi; a frontend elrejtett gombja nem biztonsági védelem. Az ERP-függvények szűk, NOLOGIN/NOBYPASSRLS szerep tulajdonában vannak. Az ERP-kiszolgáló a tényleges felhasználó JWT-jével dolgozik, általános service_role nélkül.

A munkánként több, időben változó vezető már az alap része. Az ügyfélfiókhoz pipálható több munkavégzési cím követelmény; ennek felülete és adatszűrése a későbbi ügyfélmodulban készül el. Az ügyfélportál most még nem használható. A Munkalap és Napi feladatok az elfogadott adatforrások; a KAP/Árajánlat tesztüzleti adatait nem importáljuk. A forráshoz írás ebben a lépésben nincs.
