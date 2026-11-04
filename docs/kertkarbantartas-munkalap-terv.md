# Kertkarbantartási munkalap és elszámolás – megvalósítási terv

2026. november 4. · Alap: ERP 0.11.0, bf1b654. Állapot: konkrét terv jóváhagyásra; éles módosítás még nincs.

## Követelmény és forrás

A fejlesztői PDF 18. fejezete és 25/22–23. tesztesete az alap. A meglévő Munkalap forrását és csak a munkalap.billing_prices katalógusának szerkezetét/darabszámát olvastuk: 83 rekord, 82 aktív, 57 aktív és jóváhagyott. A régi csapatonkénti időpárokat, mennyiségi tételeket, egyedi sorokat, előnézetet és elszámolási működést funkcionálisan vesszük át. A régi appban sem kód, sem adat, sem jogosultság nem változik.

A felhasználó megerősítette: a régi árlista egységárai már a végleges, ügyfél által fizetendő árak. Nem növeljük őket újabb áfával, nem találunk ki nem igazolt nettó/áfa-megbontást. A munkalap belső elszámolás, nem adóügyi számla. A kertépítés nettó/áfa/bruttó számítása változatlan marad.

## Felhasználói működés

- Megrendelő saját, kijelölt címére kertkarbantartást vagy visszahívást kérhet: szöveg, opcionális kívánt nap, létszám, óraszám és becsült feladatok. Az igény nem végleges időpontfoglalás. Az iroda egyezteti, jóváhagyja és munkatársakat rendel hozzá.
- A meglévő ERP-ben már létrehozott karbantartási igények és jóváhagyott munkák is használhatók; nem keletkezik második párhuzamos munkatörzs. A munka továbbra is egy ügyfél konkrét munkavégzési címéhez kötődik.
- Iroda és az adott munkához érvényesen rendelt Karbantartásvezető készít munkalapot. A régi minta szerint legfeljebb három csapat, létszám, érkezés/távozás, opcionális résztvevők, feladatleírás, anyag- és fuvarmennyiségek, alvállalkozó/gépbérlés megjegyzései rögzíthetők. Ugyanaz az idő nem számolódik kétszer.
- A katalógus meglévő egységárát csak iroda szerkesztheti. Vezető csak mennyiséget módosíthat; kizárólag Egyéb sorban írhat szabad megnevezést, mértékegységet, mennyiséget és egységárat. Az ellenőrizetlen, hiányzó vagy inaktív törzsár nem lesz észrevétlenül végleges fizetendő ár.
- Mentett piszkozat és külön közzétett munkalapváltozat készül. Közzététel előtt kötelező teljes, tételes, árakat tartalmazó előnézet és kifejezett megerősítés. A megrendelő azonnal a közzétett változatot látja, PDF-et nézhet/menthet, fizetési szándékot jelezhet.
- Új piszkozat nem tünteti el az ügyfél korábbi közzétett PDF-jét. Irodai korrekció új, naplózott változat, az eredeti megmarad. Tétel kivehető, helyi szerkesztés visszavonható; mentett munkalap visszavonása/visszaállítása külön esemény és elszámolási korrekció, nem előzménytörlés.
- Vezető: Elszámoltam a megrendelővel, a pénzt átvettem. Teljes vagy részösszeg megadható. Készpénznél fizikai átvételi jelzés; átutalásnál csak fizetési jelzés. Mindkettő az iroda teendője, tényleges befizetéssé kizárólag irodai igazolás után válik.
- Az ERP már kész Pénzügyek moduljába kerül a karbantartás elszámolható értéke, előleg, részfizetés, igény és igazolt pénz. Kertépítés és kertkarbantartás külön megkülönböztethető. Egy közzétett munkalap/változat csak egyszer számít; a korrekció nem törli a korábbi pénzbeérkezést.
- Iroda teljes, Karbantartásvezető saját munkái tételes elszámolását látja. Kertész/Kertépítő műszaki tartalmat és mennyiséget kap ár nélkül. Megrendelő kizárólag saját engedélyezett címének közzétett munkalapját és ügyfélpénzügyeit látja. Belső beszerzési adatot, eredményt, jutalékot nem kap.

## Kilenc új, kizárólag saját ERP-tábla

1. erp.maintenance_catalog: saját karbantartási tételtörzs, eredeti forrás/kód megfeleltetés, megnevezés, egység, végleges ügyfél-egységár, jóváhagyottság, aktivitás, revízió. Az éles árakat kizárólag a védett adatbázis tárolja.
2. erp.maintenance_catalog_versions: megőrzött katalógusváltozások, szerkesztő, idő, importeredet és előtte/utána állapot.
3. erp.maintenance_requests: saját ügyféligény, cím és személy, leírás, kívánt nap/létszám/óra, állapot, irodai döntés, kapcsolat a meglévő erp.garden_projects karbantartási munkához.
4. erp.maintenance_worksheets: karbantartási munkalap feje, dátum, piszkozat- és közzétett változat külön mutatóval, állapot és revízió.
5. erp.maintenance_worksheet_versions: teljes, megőrzött munkalappillanatkép, csapatidők, munkatartalom, végleges árak, számítási szabály és szerző/szerep/idő.
6. erp.maintenance_worksheet_lines: változathoz kötött tételes sorok; katalóguskód vagy Egyéb jelölés, mennyiség, díjegység, szerver által ellenőrzött ár és sorösszeg. Történeti árat a törzsváltozás nem ír át.
7. erp.maintenance_cash_claims: vezetői készpénzátvételi/átutalási jelzés, részösszeg, tényleges jelző személy, állapot, kapcsolat a saját pénzügyi igényhez és irodai igazoláshoz.
8. erp.maintenance_events: megőrzött eseménynapló, kérésazonosító, ujjlenyomat, szerző és aktív szerep, eredmény; megismételt kérés nem hoz létre második rekordot.
9. erp.maintenance_notifications: igényhez/munkalaphoz/pénzjelzéshez kötött jogosult címzettek teendői és értesítési előzményei.

Minden új tábla RLS/FORCE RLS védett, közvetlen anon/authenticated hozzáférés nélkül, szervezethez kötött idegen kulcsokkal és indexekkel. Saját gateway és service-only RPC-k ellenőrzik újra az aktív ERP-személyt, szerepkört, munkát és címet. Auth és a régi alkalmazások belépései nem változnak.

## Meglévő saját ERP-kapcsolatok

- Kizárólag az ERP saját pénzügyi hatókör-/szerződés-/eredmény-/frissítési és munkalistázó függvényei bővülnek karbantartási ággal. A kertépítési ág számításai, átvételi pipái és jutalékadatai nem írhatók át emiatt.
- Legfeljebb két új saját ERP-trigger: karbantartási közzétett munkalapváltozás → elszámolható érték; saját payment_entries esemény → vezetői jelzés irodai igazolási állapota. A régi Munkalap, Kassza, Napi feladatok és Munkabér sémáiban nincs változás.
- Közzétett karbantartási munkalap azonnal elszámolható, de nem automatikusan kifizetett. Csak az iroda adhat hozzá tényleges pénzigazolást a már kész pénzügyi naplóban. Az egyszer már rögzített pénz nem tűnik el későbbi munkalapkorrekció miatt.
- A Pénzügyek felület és a saját ügyfélportál megfelelő megnevezésekkel fogadja az új karbantartási ágat. A közzétett PDF a megfelelő munkalapcímet használja, kizárólag Díszkertek arculattal és végleges elérhetőségekkel.
- Az árlista egyszeri, csak olvasásos forráslekérésből kerül védett ERP-másolatba. Minden forrásrekord eredete és jóváhagyottsága megmarad; inaktív vagy ellenőrizetlen árat nem aktiválunk automatikusan. Árak, ügyféladatok és forrásmunkalapok nem kerülnek publikus seedfájlba/GitHubra. A további ármódosítások az ERP saját, irodai szerkesztőjében történnek; a régi árlista nem változik.
- Régi munkalap-/elszámolás-/befizetés-előzményt ebben a modulfejlesztésben nem migrálunk automatikusan. Azok külön ellenőrzött átállási megfeleltetést és egyezőségi próbát igényelnek; nem keletkezik feltételezett régi pénzmozgás.

## Számítás, használhatóság és ellenőrzés

Pontos numerikus számítás: mennyiség legfeljebb hat tizedes; egységár és pénz két tizedes; belső egész/numerikus műveletek, lebegőpontos pénzösszeadás nélkül. Létszám × érvényes percek adja az emberpercet, óradíj esetén /60. A korábbi végleges egységárra nem kerül újabb áfa. A szokásos megjelenítés legfeljebb két tizedes és fölösleges nullák nélkül.

Mobilon is teljes értékű, tömör, lenyíló felület, két karaktertől ékezetfüggetlen ABC-keresés, felső × bezárás, előnézet, visszavonás/újra, mentetlenadat- és ütközésjelzés. Helyi piszkozat személyhez/szervezethez/munkához/szerephez kötve; közzététel és pénzigazolás kizárólag hiteles online válasz után végleges. Az újra megnyitott, ellenőrzött saját munkamenet egyezteti az adatokat; a fájlokhoz nincs új Supabase Storage vagy előfizetés. A levélküldés kézi marad.

Kötelező tesztek: PDF 25/22–23; vezető nem ír át törzsárat, Egyéb sor árazható; hiányos/ellenőrizetlen ár nem küldhető ki; három csapat emberperce és óradíja; kötelező áras előnézet és azonnali ügyfél-PDF; részösszegű készpénz/átutalás csak jelzés, irodai igazolásig nulla új befizetés; korrekció és visszavonás megőrzi a korábbi pénzt; saját/idegen cím, munka, személy, szervezet, lejárt/visszavont megbízás; ismétlés, ütközés, elveszett válasz; 100 feletti lapozás; offline piszkozat; mobil és asztali nézet. A 424 meglévő teszt teljes regressziója, új adatbázis-/gateway-/számítási tesztek, build és edge-típusellenőrzés kötelező.

## Élesítés és határok

Jóváhagyás után helyi megvalósítás és elkülönített tesztek, saját ERP-mentés, tranzakciós telepítés, saját gateway és felület. Éles kitalált munkalap, hamis pénzátvétel, tényleges e-mail vagy Kassza-mozgás nem készül. Rövid magyar README, külön karbantartási útmutató és fejlesztési napló; ellenőrzés után main commit/push és Pages-verzióellenőrzés.

A PDF 19. fejezetének teljes Napi feladatok/Naptár migrációja külön következő modul. Ügyfélkapacitás-foglalás és dolgozói naptár ebben a kiadásban inaktív marad; a visszahíváskérés/kívánt nap nem foglal tényleges idősávot és nem ígér ellenőrizetlen kapacitást. A karbantartási munkalapok/elszámolás funkcionális része ettől függetlenül elkészül.
