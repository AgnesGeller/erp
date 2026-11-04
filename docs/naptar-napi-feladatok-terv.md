# Naptár és Napi feladatok – részletes megvalósítási terv

2026. november 4. · Kiindulás: ERP 0.13.0, ebea5c0. Állapot: a felhasználó jóváhagyta a tervet és a tesztek utáni ERP-élesítést; a 0.14.0-ban megvalósult. A tervezéskori felmérés adatai történeti kiinduló számok, az import tényleges eredménye a fejlesztési naplóban szerepel.

## 1. Követelmények és ellenőrzött kiindulás

Az eredeti fejlesztői PDF 19. fejezete, a 18. fejezet kapacitásnaptára és a 25/24. elfogadási teszt az irányadó. A PDF 3. oldala kéri az azonosítható munkatársak eredeti színeinek megtartását. A meglévő Napi app kódját és két üzleti adattáblájának szerkezetét/darabszámait csak olvastuk; a működő appokban nem módosítunk semmit.

A felméréskor a Napi feladatok forrásában egy közös adattulajdonos, egy konfiguráció és 43 napi rekord volt: 38 aktív terv, 5 törlést jelző rekord; 181 aktív feladat és 16 előjegyzés, 2026. szeptember 21. – november 10. között. A konfiguráció 8 munkatársat, 5 autót, 12 eszközt, 8 anyagot, 17 sablont és 0 ismétlődő munkát tartalmazott. Ezek időponti adatok: importkor újból teljesen ellenőrizendők, nem beégetett darabszámok.

A forrás napi tervében találkozó, megállók, közös megjegyzés, csapatok, ügyfél- és címazonosítók, kezdési idő, munkatársak, autók, feladatok és lépések, eszközök/darabszámok, anyagok/beszerzési helyek, munkanapló-elvárás, intenzitás/minőség és megjegyzések szerepelnek. Az előjegyzés Munka / Felmérés / Megbeszélés / Személyes típusú, találkozóidővel és emlékeztetőkkel. Ezek nem veszhetnek el.

**Lényeges hiány:** a régi feladatok nem tárolnak befejezési időt vagy biztos időtartamot. Az import megőrzi a kezdést; nem talál ki munkaórát. Hiányos időbeosztású napon az ügyfélnek nem mutatunk bizonyítottan szabad foglalható kapacitást. Az iroda megadhatja a ténylegesen tervezett időablakokat, rendelkezésre álló létszámot és időtartamokat. Tervezett naptáridő nem lesz tényleges munkalap, elszámolható idő vagy pénzügyi tétel.

## 2. Mit lát a felhasználó?

- **Iroda:** egy Naptár menüpont az egyszerű kezdőlap kiegészítő irodai menüjében. Napi, heti és havi nézet; a jelenlegi Napi app péntek–csütörtök hetét megtartjuk. Név/cím szerinti ékezetfüggetlen keresés, összecsukható csapatok és munkák, dátumos lista. Nem jelenik meg minden űrlap egyszerre.
- A napi terv létrehozható, másolható és módosítható. Ügyfél/cím a közös ügyfélforrásból választható; meglévő ERP-kertépítéshez, karbantartáshoz vagy felméréshez kapcsolható. A régi csapatkapcsolatok, a munkatárs- és autószínek, lépések, sablonok, eszközök, anyagok és elvárások megmaradnak. Tétel kivehető, helyi szerkesztés visszavonható; mentett terv visszavonása és visszaállítása naplózott, nem fizikai előzménytörlés.
- Ismétlődő munka heti, kétheti, havi és kijelölt napokra adható, kezdő/záró nappal. Újrafuttatás nem dupláz. Az előállítás véges időszakra történik; a korlátot a felület jelzi, soha nem csonkol észrevétlenül.
- Napi és kiválasztott időszaki nyomtatás/PDF, helyi ZIP/JSON mentés és visszaolvasási előnézet; a meglévő Napi exportformátum beolvasható. Az importált történeti elnevezések és színek a későbbi törzsmódosítástól függetlenül visszanézhetők.
- **Kiküldés:** a korábbi döntés szerint manuális. PDF-letöltés, levélszöveg másolása, rendszer-/webes levelező lehetősége; nincs Outlook-kényszer. A levelező megnyitása nem jelöl automatikusan elküldést. Az iroda kifejezett megerősítésére készül kiküldési esemény. Címzettként ellenőrizhető, mely csapatnak és milyen tartalom megy; személyes előjegyzés nem kerül mások csapatlapjára.
- Minden új ablak felső × gombbal és Esc-pel becsukható; mentés közben/mentetlen szerkesztésnél a meglévő mentésvédelem működik. Korlátozott kapcsolatnál egyértelmű mentési állapot és újrapróbálás; távoli új verziót nem írunk felül csendben.

## 3. Szerepkörkapcsolók és adatvédelem

Első éles állapot: **irodai naptár bekapcsolva; Építésvezető, Karbantartásvezető, Kertész, Kertépítő és Megrendelő naptára kikapcsolva; ügyfélfoglalás kikapcsolva.** A kapcsolók csak irodai módosítással és naplóval változhatnak. A letiltott nézetek közvetlen API-kéréssel sem hozzáférhetők.

A dolgozói nézet bekapcsolás után is csak az adott személyhez ténylegesen rendelt napi feladatokat adja ki; vezető a hozzá rendelt munkákhoz kap műszaki adatot. Az általános munkaszerep nem elég tetszőleges csapat napitervéhez. A személyes előjegyzések, más ügyfél címe, belső megjegyzés, ár és jutalék nem kerülhet idegenhez, PDF-be, pushba vagy offline csomagba. A napi kiosztás nem ad új kertépítési átvételi vagy karbantartási vezetői jogosultságot: ezekhez továbbra is az iroda munkánkénti megbízása szükséges.

A megrendelő kizárólag a kijelölt saját címeihez kérhet karbantartási időpontot. A szabad kapacitás API csak választható időablakot/létszámot ad; más ügyfél nevét, címét, személyes blokkját nem. A szabad dátumigény és a tényleges foglalás külön fogalom; az iroda külön engedélyezheti a dátumigényt.

## 4. Kapacitás és foglalás

- A munkaidőablakokat és rendelkezésre álló létszámot az iroda állítja be. Nem találunk ki automatikusan nyitvatartást, műszakot vagy létszámot. Beállítatlan/ellentmondó kapacitás nem foglalható.
- Egyszeri és ismétlődő tiltások: teljes cégre vagy kijelölt munkatársra, konkrét időszakra. Lehet tiltás akkor is, ha nincs másik munka. A letiltott erőforrás és időpont nem ajánlható fel.
- Karbantartás kezdete elé **60 perc**, vége után **60 perc** belső foglalás kerül az érintett kapacitáshoz. Ez soha nem növeli a munkalap ügyfélidejét vagy árát. Éjfélhatárt is kezelni kell.
- Ügyfél időpontkérése függő igény; az iroda jóváhagyása véglegesít. A függő kérések nem jelentenek garantált foglalást; az irodai jóváhagyáskor újra kell ellenőrizni a teljes kapacitást és a puffereket. Időközben elfoglalt sávnál nincs automatikus ráfoglalás.
- Jóváhagyás ugyanabban az ERP-tranzakcióban hozza létre a végleges foglalást és kapcsolja az igényt a meglévő karbantartási megrendeléshez. Nem keletkezik második ügyfél, cím vagy párhuzamos munka. Azonos szervezet/időszak módosításai sorba állnak; két egyidejű irodai jóváhagyás nem foglalhatja túl a létszámot vagy ugyanazt a személyt/autót.
- Módosítás/visszavonás felszabadítja a megfelelő foglalást, előzménnyel. Egy régi, bizonytalan időtartamú tervet az iroda pontosít; nem tűnik el a kapacitásellenőrzésből.
- Magyar helyi nap/idő: Europe/Budapest. Nem létező vagy kétértelmű óraátállítási időpontot egyértelmű hiba vagy kifejezett időzóna-eltérés választása nélkül nem mentünk. Heti/havi ismétlés helyi dátumot követ.

## 5. Tizenöt új, kizárólag saját ERP-tábla

Minden üzleti kapcsolat szervezeti azonosítóval védett; ahol lehet, összetett idegen kulcs kapcsolja a meglévő persons, garden_projects és maintenance_requests táblákhoz. Az erp_private objektumai nem publikus API-k.

1. **erp.calendar_settings:** szervezetenkénti szerepkörkapcsolók, ügyfélfoglalás/dátumigény kapcsoló, munkaidőablakok és létszámkapacitás; revízió és módosító. Üres kapacitás nem számít szabadnak.
2. **erp.calendar_catalog:** munkatárs-, autó-, eszköz-, anyag-, sablon- és ismétlődés-bejegyzések típusjelöléssel; eredeti forrásazonosító, név, szín, aktivitás, sorrend, teljes típusfüggő adatok és revízió. Munkatársnál opcionális ERP-személykapcsolat. Egyedi kulcs: szervezet + forrás + típus + forrásazonosító. A manager mező vagy névegyezés önmagában nem ad jogosultságot.
3. **erp.daily_plans:** egy aktív napiterv-fej szervezet/nap szerint; aktuális változat, forráseredet, módosításjelzés és visszavonási állapot. Több forrástulajdonos esetén nincs automatikus dátum szerinti összemosás.
4. **erp.daily_plan_versions:** megőrzött teljes napitervdokumentum, csapatokkal és minden eredeti mezővel, szerzővel, idővel, revízióval és forráslenyomattal. A JSON szerkezetét és a hivatkozások szervezeti összetartozását szerveroldalon ellenőrizzük; idegen kulcsérték nem rejthető JSON-ba.
5. **erp.calendar_slots:** pontosított, időzített napi feladatok és jóváhagyott foglalások; kezdés/vég, feladat- és munkakapcsolat, létszám, dolgozó/autó-erőforrások és karbantartási puffer. Az ismeretlen végű importot külön bizonytalan időbeosztásként tartjuk nyilván.
6. **erp.calendar_blocks:** egyszeri és ismétlődő tiltások, erőforrásszűkítés, helyi dátum/idő, érvényesség és kivételek; visszavonható előzménnyel.
7. **erp.calendar_booking_requests:** saját ügyfél/cím, kért sáv és létszám, állapot, irodai döntés és revízió; kapcsolat a meglévő karbantartási igényhez/munkához. Kérés nem végleges slot.
8. **erp.calendar_events:** csak hozzáfűzhető import-, mentés-, kiosztás-, kapcsoló-, kiküldés-, foglalási és visszavonási események; érintett változat és cselekvő.
9. **erp.calendar_notifications:** kizárólag jogosult címzettnek szóló teendők/értesítések, olvasottság és eseménykapcsolat; például új időpontkérés, megváltozott napi beosztás, irodai döntés.
10. **erp_private.calendar_source_rows:** a Napi két üzleti táblájának változatlan, privát forráspéldányai; tulajdonos, nap/konfiguráció, forrásidő és lenyomat, importfutás, törlési jelzés. Régi forrásváltozat megőrizhető; nem tartalmaz Auth-adatot vagy eszköztitkot.
11. **erp_private.calendar_import_runs:** engedélyezett forrástulajdonos, importmanifest, teljességi számlálók, állapot és ütközések. A forráskonfiguráció és összes lapozott napi rekord együtt ellenőrizendő; nincs észrevétlen 100/1000 soros csonkolás.
12. **erp_private.calendar_commands:** kérésazonosító, szereplő, műveletlenyomat és eredmény az ismételt mentés/import/foglalás elleni védelemhez. Azonos kérés más tartalommal elutasítandó; ismétléskor is friss jogosultság-ellenőrzés kell.
13. **erp.calendar_push_subscriptions:** kizárólag új, saját ERP-eszközfeliratkozások, személy/szervezet, aktivitás és frissesség. A régi Napi feliratkozásait és kulcsait nem másoljuk át.
14. **erp.calendar_reminders:** találkozóidő előtti egyórás és külön megadott emlékeztetők, helyi dátum/időből kiszámolt esedékességgel, aktuális tervváltozattal és jogosult címzettel. Módosításkor a régi sorok nem küldhetnek téves emlékeztetőt.
15. **erp_private.calendar_reminder_deliveries:** feliratkozásonkénti kézbesítés, duplikációvédelem, részleges hiba és újrapróbálás. A lezárt technikai kézbesítési naplók 30 nap után takaríthatók; napitervet, fényképet és üzleti előzményt nem törlünk automatikusan.

A személyek eredeti Napi-színe a naptári törzsbe kerül. A meglévő munkatervi person_colors értékeket nem írjuk felül csendben. Az iroda ellenőrzi a név/azonosító szerinti megfeleltetést; többértelmű névnél kézi kiválasztás kell. A naptári szín és forrásazonosító megmarad akkor is, ha a régi résztvevőnek nincs ERP-fiókja. Az ilyen importált személy nem kap automatikus belépést.

## 6. Kiszolgáló és érintett meglévő ERP-részek

A jelenlegi ERP-gateway kap saját calendar_* műveleteket. A belépésellenőrzés, szerveroldali Auth-felhasználó/munkamenet és ERP-tagság vizsgálata változatlan alap. A kliens nem dönthet jogosultságról vagy szabad kapacitásról. Legfeljebb nyolc új, szűk saját RPC-csoport készül: olvasás; napiterv/törzs mentés; beállítás/blokk; forrásimport; foglalás; értesítés; saját eszközfeliratkozás; emlékeztető-kézbesítés. Csak a gateway/service szerep hívhatja őket, a valós actor/session szerveroldali vizsgálatával; közvetlen anon/authenticated táblajog és publikus titok nincs. ENABLE/FORCE RLS, rögzített search_path és szűk meglévő ERP-végrehajtói szerep szükséges.

Legfeljebb két új, kizárólag saját ERP-adatra kapcsolt trigger biztosítja, hogy a napiterv megváltozása, illetve a meglévő ERP-karbantartási igény másik felületen történt módosítása/visszavonása ne hagyjon elavult foglalást vagy emlékeztetőt. Az ERP saját maintenance írási útja kap kapcsolódó foglalásellenőrzést; változatlan munkalap- és pénzügyi képletekkel. Régi apphoz tartozó tábla, trigger, függvény vagy jogosultság nem változik.

Új saját erp-calendar-reminders Edge Function és egy saját ERP-nevű cronfeladat kezeli az engedélyezett emlékeztetőket. A szükséges pg_cron, pg_net és Vault már jelen van az ERP-t befogadó projektben; új bővítményt nem telepítünk. Saját ERP VAPID- és ütemezési titok kizárólag szerveroldali tárolóba kerül, régi titkot nem cserélünk. A push eszközönként, önkéntesen engedélyezhető; nincs SMS vagy fizetős szolgáltatás. Lejárt/megvont jogosultságnál a kiküldő ismét szűr; a zárolt képernyőre alapból általános, személyes adat nélküli szöveg kerül. Böngésző-/operációsrendszer-korlát esetén az alkalmazás érthetően jelzi a támogatottságot; biztos hangot vagy kézbesítést nem ígér.

## 7. Forrásadat-átvétel, szinkron és visszaállítás

**Egyirányú olvasás a régi Napi appból az ERP-be.** Az ERP-ben létrehozott/szerkesztett napi terv az ERP saját adata; a régi Napi appba nem írunk vissza. Ez őrzi meg a működő app változatlanságát. Az ügyféllista továbbra is a korábban engedélyezett Munkalap-alapú forráskapcsolatot használja; nem importálunk új párhuzamos ügyféltörzset a Napi történeti névmezőiből.

1. Kizárólag a szerveroldalon engedélyezett szervezeti forrástulajdonost olvassuk; tetszőleges owner_id/project URL nem adható meg a böngészőből. Két olvasott üzleti tábla: napi_app_config és napi_daily_plans. Nincs forrás-DML, source RPC-hívás, új forrástábla, policy, trigger, Auth- vagy cronmódosítás.
2. Előzetes importjelentés készül a teljes tartalomról, azonosítókról, dátumokról, feladat- és konfigurációszámokról, hiányzó személy/címmegfeleltetésről és időadatokról. A PDF-eket és a JSON/ZIP mentéseket a felhasználó saját gépére lehet letölteni. Az üzleti tartalom nem kerül GitHubra.
3. A teljes olvasás lenyomattal és forrásidőkkel, ismételt ellenőrzéssel igazolt. Közben változó forrás esetén új olvasás vagy érthető megszakítás következik, nem hamis siker. Egy saját ERP-importtranzakció kerül véglegesítésre; részleges állapot nem jelölhető teljesnek.
4. A régi lokális, még nem felhőbe mentett adatokat a két forrástábla nem bizonyítja. Az iroda saját Napi ZIP/JSON exportjának előnézetes beolvasása külön kiegészítő importút; nem nyúlunk a régi app helyi tárához, és nem veszítjük el az eltérő változatokat.
5. Ismételt import/frissítés új adatot átvehet, változatlan sort nem dupláz. Ha az ERP-másolatot közben szerkesztették, a régi app változása összevethető ütközésként jelenik meg. Az iroda választhat, nem történik csendes felülírás. A forrás törlése csak akkor vonja vissza az aktív importmásolatot, ha az ERP-ben nem történt önálló módosítás; az előzmény mindenképp megmarad.
6. Az ERP-eszközök ugyanazt a saját adatbázist olvassák. Mentés után frissítés, látható nézetben időszakos újraolvasás és kézi Frissítés biztosít követést. Offline piszkozat személyhez/szervezethez kötött, korlátozott tartalmú; kijelentkezéskor nem marad más számára olvasható. Ütközéses mentés revízióval áll meg. Foglalás, jóváhagyás és kapcsolóváltás csak online véglegesíthető.
7. Próba kizárólag helyi szintetikus adatokkal, szükséges éles próba a felhasználó engedélye szerint Teszt vagy Geller Ágnes ügyféllel, egyértelmű TESZT jelöléssel, megőrizve. Nem küldünk kéretlen levelet és nem készítünk hamis pénzügyi eseményt.
8. Hibánál az új ERP-naptár kapcsolóval letiltható, saját cron leállítható, korábbi ERP-gateway/felület visszatehető. A migrált adatok megmaradnak vizsgálatra; a régi Napi app változatlanul használható, nincs rá visszaállítási művelet.

## 8. Megvalósítási és ellenőrzési sorrend

1. Jóváhagyott terv után saját adatmodell, migráció és csak olvasó forrásadapter; helyi adatbázistesztek és teljes importmanifest.
2. Napi/heti/havi irodai nézet, teljes szerkesztés, törzsek/sablonok/ismétlések, színek, visszavonás, PDF és export/import; a meglévő mobil- és ablakkezelési mintákkal.
3. Egyszeri/ismétlődő blokkok, pontosított kapacitás, 1+1 órás puffer, külön kapcsolók; saját ERP-karbantartási igény és irodai jóváhagyás összekapcsolása. A dolgozói/ügyféloldalt bekapcsolt és kikapcsolt állapottal egyaránt tesztelni kell, éles alapállapotuk kikapcsolt marad.
4. Saját értesítések és eszközön engedélyezhető push-emlékeztetők; kézbesítési és adatvédelmi próbák.
5. Célzott és kapcsolódó teljes regressziós tesztek, build/edge ellenőrzés, asztali és mobil böngészőpróba, PDF-tördelés. Rövid magyar README, részletes képes útmutató, napló és állapotfrissítés.
6. Tesztek után csak saját ERP-migráció/függvénytelepítés és import; induló kapcsolók visszaellenőrzése, mentés és próbált helyreállítás. Main commit/push, GitHub Pages-ellenőrzés. Nem jelentjük késznek a teljes ERP-t vagy a közös üzleti átvételt e modul elkészültétől.

Kötelező esetek: teljes 38/181/16 kiinduló tartalom és 5 törlési jel megőrzése az import pillanatának friss manifestje alapján; forrásváltozás/hiba/részimport/ismétlés/azonos nap-több forrástulajdonos; minden napi mező és szín; történeti törzs; 100/1000 feletti lapozás; több csapat, több munka, összetett eszközmennyiségek; egymás melletti és párhuzamos időpontok; hiányzó végidő; heti/havi/évváltás és óraátállítás; 1+1 óra nem számlázódik; tiltások; versengő foglalások; visszavonás; letiltott közvetlen API; más személy/cím/szervezet adatának tiltása és ügyfél-kapacitás adatminimalizálása; kézi kiküldés nem automatikus levél; mentetlen ablakok, frissítés és offline ütközés; push részhiba/duplikáció/időpontmódosítás/jogosultságmegvonás; a régi appba irányuló minden írási kísérlet tesztben tiltott.

## 9. Jóváhagyandó konkrét változás

15 új saját ERP-tábla; legfeljebb 8 szűk RPC-csoport és 2 saját ERP-trigger; az ERP-gateway/naptár és saját karbantartási kapcsolat bővítése; saját ERP-emlékeztető-függvény/cron és új saját titkok; egyirányú Napi-adatimport, tesztek utáni saját ERP-élesítéssel. Nincs új előfizetés, framework, Auth-átalakítás vagy régi appot érintő módosítás. A felhasználó AGENTS.md 13. pontja miatt a jelentős adatbázis-/hozzáférési bővítéshez a megvalósítás előtt külön jóváhagyás szükséges.
