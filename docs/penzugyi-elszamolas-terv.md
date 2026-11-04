# Pénzügyi elszámolás, belső eredmény és éves jutalék – megvalósítási terv

2026. november 4. · Kiindulás: ERP 0.10.0, b183f5f. Állapot: a felhasználó 2026. november 4-én jóváhagyta a megvalósítást és a tesztek utáni ERP-élesítést. Még nincs telepítve.

## Cél és hatókör

A teljes fejlesztői PDF 16–17. fejezete, a 22. fejezet pénzügyi szabályai és a 25. fejezet 20–21., 27–28. tesztesete. Saját ERP-nyilvántartás készül a már működő ajánlat-, munkaterv-, átvétel-, munkaidő- és anyagmodulra építve. A kiegészítés szerint a Kassza és a Munkabér külön marad: nincs hozzájuk írás, adatátvétel vagy automatikus könyvelés. Auth, hosting, külső szolgáltatás és előfizetés nem változik. A karbantartás pénzügyi kapcsolata előkészíthető, de a még el nem készült karbantartási munkalaphoz nem keletkezik kitalált elszámolás.

## Mit kap a felhasználó?

- Külön Pénzügyek felület irodának és megrendelőnek: ügyfél/cím/kertépítés szerinti szűrés, teljes megrendelt érték, anyag/munkadíj, ügyfél által átvett tételek, befizetések, előlegek, egyenleg és megőrzött előzmények.
- Fizetési szándék az ügyféltől; fizetési vagy számlakiállítási igény az irodától; elfogadás/vitatás, visszavonás és értesítések. A számlaigény belső kérés, nem kiállított adóügyi számla. A kézi levélküldés marad.
- Csak iroda igazolhat tényleges beérkezett pénzt. Összeg, készpénz/átutalás, dátum, jogcím, számlázási alany és opcionális hivatkozás szerepel. Részfizetés és előleg is kezelhető; előleg miatt negatív elszámolható egyenleg megengedett.
- Hibás befizetést nem törlünk: indokolt ellenesemény és új helyes tétel, tényleges pénz-visszafizetésnél külön visszafizetési esemény. Az ügyfélátvétel visszanyitása nem tünteti el a korábbi befizetést.
- Irodai belső eredmény: munkaidőből számított megtakarítás/veszteség, meglévő 100/70/0 szerinti anyagoldali eredmény és összesítés. Hiányzó óradíj/tervidő/anyagár esetén hiányos számítás, nem hamis nulla vagy végleges nyereség.
- Külön Munka átadva / Kertépítés lezárva és Teljes munka kifizetve állapot; a fizetettséget ténylegesen igazolt pénz és érvényes megrendelt összeg alapján ellenőrizzük. Zárási pillanatkép és indokolt, naplózott korrekció készül.
- Éves jutalék: alapból csak iroda látja; külön kapcsolóval a dolgozó csak saját éves/projektes adatát. Alapja irodai választás szerint munkaeredmény, anyageredmény vagy mindkettő. Pozitív és negatív eredmény megmarad; felosztás a kertész/kertépítő szinten ténylegesen jóváírt, munkadíjjal súlyozott részesedés szerint. Magasabb szintű ellenőrzés önmagában nem végrehajtói részesedés. Nem vezetünk be a PDF-ben nem szereplő jutalékszázalékot.
- Külön jóváhagyott pontosítás: éven átnyúló kertépítés jutaléka a lezárás évébe számít; addig előzetes, nem végleges éves járandóság. Évközi jutalékelőleg nincs; kifizetés csak az év végén vagy azután jelölhető. Új év nulláról indul, korábbi negatív év nem kerül át. A történeti éves elszámolás a projekt archiválása/törlése után is megmarad. A negatív analitikai egyenlegből nem lesz automatikus bérlevonás.

## Tizenkét új, kizárólag saját ERP-tábla

1. `erp.finance_accounts`: munkához kötött pénzügyi nyilvántartás, revízió, külön átadási és fizetettségi állapot; szervezet/projekt kapcsolat.
2. `erp.receivable_versions`: az átvett munkafázisok megőrzött elszámolási változatai, ügyfélár- és áfa-pillanatkép, különbség, forrásesemény és forrásverzió.
3. `erp.finance_documents`: fizetési szándék, irodai fizetési igény és számlaigény; összeg, mód, számlázási alany, állapot és revízió.
4. `erp.finance_decisions`: az igények elfogadása, vitatása és visszavonása, indokkal és tényleges döntéshozóval.
5. `erp.payment_entries`: megőrzött tényleges befizetés, előleg, visszafizetés és ellenesemény; kapcsolat az eredeti tételhez és opcionális igényhez.
6. `erp.finance_events`: kérésazonosítóhoz kötött műveleti napló, előtte/utána adat, eredmény és ismétlésvédelem.
7. `erp.finance_notifications`: eseményhez, munkához és jogosult címzetthez kötött pénzügyi teendők/értesítések.
8. `erp.profit_snapshots`: belső eredményszámítás megőrzött változatai; ajánlat-, feladat-, idő-, anyag- és szabályforrások, számítás teljessége, zárási/korrekciós állapot.
9. `erp.finance_policy_versions`: külön eredményláthatóság, jutalékaktivitás és jutalékalap változatai; alapból dolgozóknak rejtve.
10. `erp.commission_project_versions`: évhez kötött projekt-hozzájárulás megőrzött változatai, eredményforrással és számítási állapottal.
11. `erp.commission_person_entries`: személyenkénti, előjeles éves projekt-hozzájárulás és megőrzött korrekció; felosztási arány és forrás. Törléskor nincs kaszkádos elvesztés.
12. `erp.commission_year_settlements`: év végi személyes elszámolás és kifizetésjelölés, rögzített összeggel, forrásjegyzékkel és naplózott későbbi korrekcióval.

Minden új tábla RLS/FORCE RLS védett, közvetlen anon/authenticated hozzáférés nélkül. A saját gateway frissen ellenőrzi az ERP-munkamenetet; service-only RPC-k ismét ellenőrzik a személyt, szervezetet, munkát és szerepet. Összetett idegen kulcsok és indexek védik a szervezeti kapcsolatokat. Pénz HUF `numeric(22,2)`, idő/mennyiség a meglévő pontos numerikus formában; frontend számításnál nincs lebegőpontos pénzösszegzés. A megjelenítés legfeljebb két tizedes, fölösleges nullák nélkül.

## Kapcsolódás és egyezőség

- Kizárólag saját ERP-forrásokon legfeljebb hat új eseményindító: `erp.task_events`, `erp.material_movements`, `erp.material_cost_policy_versions`, `erp.construction_worksheet_events`, `erp.garden_projects`, `erp.finance_policy_versions`. A végleges SQL csak a ténylegesen szükséges eseményeket kezeli, saját függvényekkel. Más alkalmazás objektuma vagy közös ügyféltábla nem kap triggert/módosítást.
- Megrendelői átvételnél, visszaküldésnél és jóváhagyott ajánlatváltozásnál az elszámolható érték ugyanabban a tranzakcióban követi a hiteles állapotot. Nem gyártunk átvételi pipát és nem jelölünk automatikus befizetést.
- Az elfogadott aktuális ajánlat adja a nettó ügyfélértéket, áfamódot és teljes bruttó összeget; az iroda pénzbeérkezést bruttó forintban rögzít. A belső eredmény nettó kalkuláció. Részátvételek áfája determinisztikusan, az ajánlat teljes kerekített áfájával egyezően oszlik meg; teljes átvételnél a végösszeg pontosan egyezik az ajánlattal.
- Már létező ERP-munkán az első pénzügyi betöltés alapállapotot rögzít forrásverzióval; nem talál ki múltbeli pénzmozgást. Meglévő régi appokból nincs befizetésimport.
- Projekt/szervezet szerinti zárolás, elavult revízió elutasítása, stabil műveletazonosító és ujjlenyomat védi az ismételt vagy párhuzamos mentést. Elveszett válasz esetén ugyanaz a kérés próbálható újra.
- Az eredmény/jutalék a felhasználás és megosztás változásával frissül; nincs többszörös jóváírás. Felosztatlan részt nem írunk automatikusan az ellenőrző személyre: külön hiányosságként látszik. Zárási/éves pillanatkép utólag csak külön korrekcióval változik.

## Hozzáférés és felület

Iroda: saját szervezet pénzügyei, szabályok és igazolás. Megrendelő: kizárólag a kijelölt címek saját munkáihoz tartozó ügyfélárak, jelzések és tényleges befizetések; sem belső eredményt, sem jutalékot, sem beszerzési árat nem kap. Vezető/dolgozó: alapból nincs pénzügyi hozzáférés; külön irodai kapcsolók szerint megengedett belső eredmény, illetve kizárólag saját jutalék. A két kapcsoló független. Jogosultság visszavonását a következő kérés már érvényesíti. Letöltésben/nyomtatásban ugyanez a szűrés kötelező.

A felület mobilon is teljes értékű, tömör, lenyíló részekkel és felül elérhető bezárással. Minden fontos mentés előtt ellenőrizhető előnézet, utána egyértelmű visszajelzés. Helyi szerkesztés visszavonható, mentett pénzügyi tétel csak naplózott elleneseménnyel javítható. Internet nélkül piszkozat őrizhető meg személyhez/szervezethez kötve; befizetés vagy jóváhagyás csak hiteles szerverválasz után végleges. CSV/JSON és helyi nyomtatás/PDF támogatott, új fájltároló nélkül.

## Kötelező ellenőrzések

- PDF 25/21: 85 000 Ft ügyfélátvétel → 85 000 Ft elszámolható, 0 Ft befizetett. Előleg miatt negatív egyenleg; részfizetés; készpénz és átutalás külön.
- Jóváhagyott ajánlatváltozás, visszanyitott átvétel és későbbi javítás pénzügyi korrekciója, korábbi befizetés megtartásával.
- Áfa 0/27/AAM, kis összegek és részátvételek, teljes ajánlati bruttó egyezőség; eltérő ügyfelek/címek nem olvaszthatók össze.
- Tervidő/tényleges idő szerinti pozitív és negatív munkaeredmény; PDF 25/20 anyagpélda változatlan 100/70/0 értékkel; hiányzó ár/óra nem végleges eredmény.
- Megosztás és jutalék egyszeri súlyozása; negatív év, évváltás, évközi kifizetés tiltása, korábbi éves adatok megőrzése és utólagos korrekció.
- Saját ügyfél/másik ügyfél/iroda/vezető/dolgozó/anon/másik szervezet; kapcsolók függetlensége, lejárt vagy visszavont hozzáférés; export/offline adatszivárgás tiltása.
- Ismételt és párhuzamos mentés, elavult előnézet, elveszett válasz, visszavonás/ellenesemény, lapozás és mobilnézet.
- A 403 meglévő teszt regressziója, új érdemi adatbázis-, gateway-, számítási és UI-tesztek; build és edge-típusellenőrzés. Tesztadat csak elkülönített helyi környezetben.

## Telepítés és dokumentáció

A jóváhagyás után először helyi megvalósítás és tesztek, majd saját ERP-objektumok és gateway mentése, tranzakciós telepítés/ellenőrzés, saját backend, végül felület. Éles pénzügyi próbatételt vagy tényleges ügyfélnek fizetési kommunikációt nem hozunk létre. A README rövid magyar leírást és használati hivatkozást kap; a részletek külön pénzügyi útmutatóba és fejlesztési naplóba kerülnek. Tesztelt változat a main ágra commit/push, majd online verzióellenőrzés. A megvalósítás közben jelentősen eltérő adat- vagy jogosultsági döntést külön egyeztetjük.

Telepítési állapot: 2026. november 4., saját migráció és gateway v23 sikeres; 424 helyi teszt. Éles pénzügyi rekordot a fejlesztő nem hozott létre. A kertépítés saját állapotkorlátja a lezárt állapottal bővült. Használat: [pénzügyi útmutató](penzugyi-elszamolas.md).
