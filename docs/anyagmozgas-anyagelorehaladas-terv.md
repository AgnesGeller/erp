# Anyagmozgások és anyagelőrehaladás – jóváhagyott terv

2026. november 3. · Kiindulás: ERP 0.9.0, main `6634a28`. Követelmény: a teljes fejlesztői PDF 3., 10., 15–16., 21–22. fejezete és a 25/19–20., 25/27–28. elfogadási próbák; a kiegészítés Építésvezető megnevezése és az azóta elfogadott adatvédelmi szabályok. A felhasználó a tervet és a tesztek utáni ERP-élesítést jóváhagyta. A megvalósítás folyamatban van.

## 1. Ellenőrzött kiindulás

Az ERP saját ajánlatmotorja már számolja az anyagonként beépítendő és ráhagyással/csomagkerekítéssel beszerzendő mennyiséget, beszerzési becslést és fuvarszámot. Az elfogadott ajánlatverzió változtathatatlan pillanatkép; jóváhagyott változás új verziót hoz létre. A kertépítés erre hivatkozik. A tényleges mozgásokhoz, tételekhez és beszerzési törzshöz még nincs saját ERP-tábla; ezt a saját sémák metaadatainak csak olvasási ellenőrzése is igazolta.

A meglévő értesítési tábla munkatervi eseményhez kötött. Az anyagértesítés saját táblát kap, és a már létező Teendőim felületbe kapcsolódik. A négy átvételi sáv és az ötödik munkaidős sáv változatlan marad.

## 2. Felhasználói folyamat

- Irodai **Anyagbeszerzés** menü: közös anyag- és beszállítótörzs, projektszűrés, összevont beszerzési lista, részletezhető eredeti ajánlati sorok, külön Extra anyagok lista. A kertépítés munkatervéből is megnyitható. Magyar ABC-sorrend, tömör lenyílók, két karaktertől ékezetfüggetlen keresés; mobilon teljes értékű használat.
- A terv az aktuális elfogadott ajánlat anyagaiból jön. Külön látszik a beépítendő és a beszerzendő mennyiség, a ráhagyás/csomagkerekítés és a fuvarszám. Azonos anyag csak azonos törzsazonosítóval és mértékegységgel vonható össze; bizonytalan névegyezést nem olvasztunk össze automatikusan. A forrássor és az eredeti terv megmarad.
- Anyagonként beszerzési felelős: **Kivitelezők szerzik be** vagy **Iroda szerzi be – telephelyen átvehető**. Minden szállítmány külön tételt kap, tényleges beszerzési egységárral és hellyel; eltérő egységárú szállítmányok nem vesznek el átlagolásban.
- Folyamat: Beszerzésre vár → Megrendelve → Megérkezett / telephelyen átvehető → Átvettem a telephelyen → Kivitelezés helyszínére szállítva → Beépítve. Minden lépés rész-mennyiséggel működik. Kivitelezői közvetlen beszerzésnél a tényleges helyzetnek megfelelő rövidített út választható, egyetlen atomi mentéssel.
- Telephelyi érkezéskor az adott kertépítés aktív Építésvezetői személyes értesítést és Teendőim bejegyzést kapnak. A teendő a megfelelő anyaghoz/szállítmányhoz nyílik; a még átvehető mennyiséget mutatja. Újrapróbálás nem dupláz mozgást vagy értesítést. Részátvétel után csak a maradék átvehető; másik eszközön frissítéssel, illetve a meglévő 60 másodperces lekérdezéssel jelenik meg a változás.
- Az Építésvezető azonnal felvehet extra anyagot: név/törzsanyag, mértékegység, mennyiség, beszerzési hely, ár és indok: Ügyfél kérte / Kevés volt a kalkulált mennyiség; szabad megjegyzés. Az iroda látja. Ez beszerzési igény; ügyfélre terheléshez a már elkészült kétoldalú változásjóváhagyási folyamat szükséges.

## 3. Pontosan tíz új, kizárólag saját ERP-tábla

| Tábla | Tartalom és fő kapcsolatok |
| --- | --- |
| `erp.materials` | Stabil anyagazonosító, szervezet, név, alapmértékegység, alapértelmezett beszállító/hely, becsült beszerzési egységár, csomagméret, fuvar-kapacitás, aktív állapot, revízió. |
| `erp.vendors` | Saját beszállítóazonosító, szervezet, név, beszerzési hely, aktív állapot, revízió. |
| `erp.material_catalog_events` | Változtathatatlan anyag-/beszállítótörzs-előzmény, előtte/utána adatok, tényleges kezelő és szerep, idő, indok és egyszeri kérésazonosító. |
| `erp.project_material_plans` | Kertépítéshez kötött anyagterv fejléc, aktuális ajánlat- és tervverzió, revízió, létrehozó. |
| `erp.project_material_lines` | Stabil tervezési sor, anyag FK, mértékegység, forrás ajánlati sor/anyagpozíció vagy extra, aktuális beépítési és beszerzési mennyiség, beszerzési felelős, indok, aktív állapot. |
| `erp.project_material_plan_versions` | Változtathatatlan teljes tervpillanatkép; ajánlati forrás és számítás, sorok/törzsmegfeleltetés, eredeti és aktuális mennyiségek, kezelő, idő. |
| `erp.material_lots` | Egy tervezési sor szállítmánya/megrendelése; szervezet/projekt/anyagsor FK, beszállító, hely, becsült és külön tényleges egységár, rész-mennyiségek, készletállapotok, revízió. |
| `erp.material_movements` | Megőrzött rendelés, részérkezés, átvétel, szállítás, beépítés és ellenmozgás; szállítmány FK, pontos mennyiség, forrás/cél, egységár-pillanatkép, tényleges kezelő/szerep, munkanap és rögzítési idő, eredeti esemény, kérésazonosító/ujjlenyomat és mentési eredmény. |
| `erp.material_notifications` | Anyagmozgáshoz/projekthez/címzetthez kötött értesítés és teendő, olvasási/lezárási állapot, egyedi esemény–címzett kapcsolat. |
| `erp.material_cost_policy_versions` | Szervezetenként változatelőzményes belső elszámolási súlyok, alapból 100/70/0; kizárólag irodai módosítás, kezelő/idő/indok. |

Minden új tábla RLS/FORCE RLS védett, közvetlen anon/authenticated hozzáférés nélkül; ellenőrzött saját gateway és service-only RPC-k kezelik. A szervezet-, projekt-, sor-, személy- és szállítmánykapcsolatokat idegen kulcsok és indexek védik. Mennyiségek belül hat tizedes pontosságú numerikus értékek, pénz nettó forint két tizedessel; a szokásos megjelenítés legfeljebb két tizedes, fölösleges nullák nélkül. Nagy adatlisták és események lapozhatók. Nincs új fájltároló vagy előfizetés.

## 4. Ajánlati kapcsolat és szinkron

A beépítési/beszerzési terv egyetlen ár- és mennyiségi forrása az ERP elfogadott ajánlatának rögzített számítása. A beszerzési törzs becsült ára nem írja át az elfogadott ügyfélárat, a történeti ajánlatot vagy egy már átvett szállítmány tényleges árát. A típus anyaglistájában az iroda választhat a saját közös anyagtörzsből; az új hozzárendelés nem módosít régi ajánlatot.

A saját `erp.garden_projects` elfogadott ajánlati hivatkozásához kötött új ERP-trigger az induló tervet és a későbbi jóváhagyott ajánlatváltozás anyagtervét ugyanabban a tranzakcióban frissíti. Meglévő munkához az iroda ellenőrzött betöltéssel készítheti el a kezdeti tervet. A trigger kizárólag saját ERP-adatot kezel. Név-/mértékegység-változásnál bizonytalan megfeleltetés külön rendezendő; nem kapcsoljuk át csendben a fizikai készletet.

Az eredeti terv és minden változat megmarad. Törölt ajánlati sor tényleges mozgásai és költségei továbbra is megőrződnek; a felhasználás nem tűnik el a kimutatásból. Egy extra beszerzési sor későbbi jóváhagyott ajánlati sorhoz kapcsolása irodai, naplózott megfeleltetés, így nem kettőzi meg sem az igényt, sem a készletet.

## 5. Készlet és visszavonás

Minden szállítmányon külön: megrendelt, ténylegesen beszerzett/megérkezett, telephelyi, átvett/úton levő, helyszíni még fel nem használt és beépített mennyiség. A telephelyi készlet nem helyszíni szállítás. Beépítés csak a helyszíni szabad készletből történhet; az átvétel legfeljebb a telephelyen elérhető mennyiség. A tényleges igény meghaladhatja a tervet; figyelmeztetés és pontos megerősítés szükséges, a százalék nincs 100-ra vágva.

A készlet egyenlege nem lehet negatív. Párhuzamos átvételeknél rendezett sorzár, revízió és pontos előnézeti megerősítés véd. A mozgásokat nem írjuk át vagy töröljük fizikailag: indokolt, hivatkozott ellenmozgással javíthatók/visszavonhatók. Függő későbbi felhasználást előbb rendezni kell; például már beépített anyag érkezése nem vonható egyszerűen vissza. A visszaállítás is új, ellenőrzött esemény. Tényleges ár javítása külön irodai, naplózott korrekció; a korábbi ár-pillanatkép megmarad.

## 6. Mennyiségi és költségmutatók

Külön mutatók: beszerzett/megérkezett, átvett, helyszínre szállított és beépített mennyiség, valamint maradék. A beszerzési/szállítási százalék mellett a beszerzési terv, a beépítésinél a beépítési terv a megnevezett viszonyítási alap. A 100% feletti érték látható; nulla/hiányzó tervnél nincs nullával osztás. Az extra lista külön marad.

Irodai költségek:

- Tényleges beszerzési költség = szállítmányonként a megérkezett mennyiség × tényleges beszerzési egységár.
- Elszámolt anyagköltség = beépített × egységár × 100% + helyszínen nem beépített × egységár × 70% + még helyszínre nem szállított × egységár × 0%.
- A beépített a kiszállított része: nem adódik hozzá még egyszer a teljes kiszállított mennyiség költsége. A telephely és az úton levő, még célhelyre nem érkezett mennyiség a 0%-os csoportban marad.
- Anyagoldali különbség = aktuális jóváhagyott ügyfél-ajánlati anyagérték – elszámolt tényleges anyagköltség. A viszonyítás nem a becsült beszállítói ár. A három súlyt az iroda verziózott Beállításokban módosíthatja; a számítás jelzi az alkalmazott szabályverziót.
- Hiányzó tényleges ár nem nulla költség: külön hiányjelzés, költségadatokra részleges/nem teljes állapot, megtévesztő végleges nyereség nélkül. A mennyiségi követés ettől még működik.

Ez az anyagnyilvántartás és belső anyagköltség-alap, nem pénz beérkezésének vagy kifizetésének igazolása. A következő pénzügyi modul ezt olvassa majd; a mentés most sem hoz létre Kassza-tételt, munkabért vagy automatikus ügyfélkövetelést.

## 7. Hozzáférés

| Szerep | Láthatóság és művelet |
| --- | --- |
| Iroda | Saját ERP összes anyagadata, törzs, tervek, szállítmányok, árak, mozgások, korrekciók és belső költség/súlybeállítások. Indulásra váró munkán tervezhet, fizikai mozgást futó kertépítésen rögzít. |
| Építésvezető | Kizárólag aktív saját futó kertépítés: anyaglista, beszállító/hely és várható beszerzési ár; részátvétel, szállítás, beépítés, saját kivitelezői beszerzés és extra anyag. A saját maga megadott tényleges ár visszaolvasható; mások tényleges árai és a teljes belső eredmény alapból rejtett. Törzsárat és ügyfélárat nem írhat át. |
| Kertész / Kertépítő | Saját elérhető munka műszaki anyagnevei, mennyiségei és előrehaladása; beszerzést és árat nem szerkeszt, belső beszerzési költséget és eredményt nem kap. |
| Megrendelő | Csak engedélyezett saját cím kertépítésének jóváhagyott anyagai és beépítési előrehaladása. Nem kap beszállítót, beszerzési árat/ráhagyást, belső költséget/eredményt, telephelyi részleteket vagy nem jóváhagyott extra beszerzést. |

Nem készül új Auth-fiók, belépési mód vagy automatikus szerepkörkiosztás. A szűrés a kiszolgálóban történik, a letöltés/PDF és a helyi adatok is a megfelelő szerep adatait használják. A belső eredmény más szerepköröknek engedélyezése és a jutalékrendszer kapcsolói a külön pénzügyi modulhoz tartoznak; ügyfél belső eredményt soha nem kap.

## 8. Helyi működés és felület

A megnyitott ablakok felül × gombbal zárhatók; mentetlen adatnál védelem van. Piszkozat és bizonytalan mentés személy/szervezet/projekt/szerep szerint elkülönül. Hálózati hiba után az eredeti UUID-s kérés újrapróbálható. Offline nincs készletfoglalás, színlelt átvétel vagy sikeres mentés. Friss adatütközésnél új előnézet és választás szükséges.

Listák és szerepkör szerint engedélyezett kimutatások CSV/JSON formában letölthetők és helyben nyomtathatók/PDF-be menthetők. A README rövid marad; részletes használat és napló külön fájlban készül.

## 9. Tesztek és élesítés

Kötelező: PDF 25/19 szerint 100 egységből 60 megérkezik, 40 átvehető, 20 a telephelyen marad; 41-es második átvétel tiltott. PDF 25/20 szerint 10 beépített + 2 helyszíni + 3 telephelyi mennyiség költsége 100/70/0, különböző szállítmányárakkal is, duplázás nélkül. További próbák: közvetlen beszerzés, részszállítás, >100%, hiányzó/0 terv és ár, extra–jóváhagyás szétválasztása, tervváltozás/egységütközés, visszavonás függőségekkel, párhuzamos átvétel, elveszett válasz és változatlan UUID, jogosulatlan projekt/ár/offline/export tiltása, értesítések és teendőből történő mentés egyszerisége, lapozás, mobil és korábbi regressziók.

Jóváhagyás után: saját lokális modell/SQL/gateway/felület, tesztek, saját ERP-mentés, visszagörgetett migrációpróba, a tíz tábla és az itt leírt saját ERP-trigger/RPC-k telepítése, gateway/felület élesítése, advisor és online ellenőrzés. Kizárólag az ERP README-je/naplója változik, majd main commit és push. Más alkalmazás kódját, meglévő közös tábláját, adatait vagy Auth-ját nem módosítjuk; régi rendszerekből most nem veszünk át anyagadatot.
