# Felmérések – 0.4.1

## Mire használható?

Az iroda az ügyféladatlapról vagy a Felmérések menüből indíthat felmérést. A munkavégzési cím konkrétan kiválasztandó; több cím esetén nincs automatikus választás. Egy ügyfélhez és címhez több külön felmérés tartozhat.

Az első szabad mező az „Az ügyfél elképzelései – mit szeretne?”. Nem kötelező. A főtételekhez megnevezés, tetszőleges jegyzet, opcionális hossz/szélesség/terület, fotó és hangjegyzet adható. Sem kategória, sem ár nem kell a helyszíni jegyzethez. A főtételek feljebb/lejjebb rendezhetők és kivehetők.

## Mentés és eszközök

- Gépelés után a program 750 ms nyugalmi idővel az ERP saját IndexedDB-tárába ment. A sikerjelzés csak az adatbázis-tranzakció befejezése után jelenik meg. Külön Mentés ezen az eszközön gomb is van.
- A helyi másolat szervezet és ERP-személy szerint különül el. Másik irodai fiók nem kapja meg a korábbi fiók felméréseit a felületen. Kijelentkezés után késői válasz nem jelenhet meg.
- A „Szinkronizálás” a szöveget, méreteket, ügyfél-/címkapcsolatot és fájlmetaadatokat menti az ERP saját adatbázisába. Egy felmérés hiányossága nem akadályozza a többi érvényes felmérés mentését.
- A fotó és hang nem kerül Supabase-be. Egy másik eszköz a szinkronizált jegyzetet láthatja, a fájlokat a letöltött felmérési csomag importálásával kapja meg.
- Újranyitáskor a helyi, nem módosított szöveg frissíthető a szerverről; nem szinkronizált saját változatot nem írunk felül.
- Ha két eszköz ugyanazt a szerverváltozatot módosította, a régebbi revízióval érkező mentés ütközést jelez. A helyi változat megmarad; a Szerverváltozat összehasonlítása megmutatja a másik szöveget. Automatikus összefésülés vagy néma felülírás nincs.
- Megszakadt mentési válasz után ugyanaz a kérésazonosító folytatódik. Az ismétlés nem hoz létre második felmérést.
- A már megnyitott és belépett felületen internet nélkül is menthetők a jegyzetek és mellékletek. A teljesen bezárt alkalmazás offline újrabeléptetése még nincs megvalósítva; új munkamenet igazolásához internet szükséges. Az offline helyi mentést nem nevezzük szerveres szinkronnak.

## Fotók, hangok és biztonsági másolat

A fotó legfeljebb 1920 képpontos hosszabbik oldalú JPEG-másolattá alakul; a mentett másolat nem viszi tovább az eredeti EXIF-helyadatokat. A kép helyi másolata legfeljebb 6 MB, a hang legfeljebb 12 MB. A főtételhez hangfájl is hozzáadható vagy a böngésző mikrofonjával felvétel készíthető. A felvételt be kell fejezni a helyi hangfájl mentéséhez; mikrofon-engedély nélkül nincs titkos rögzítés.

A mellékletek külön is letölthetők. A „Felmérés és fájlok letöltése” ZIP-csomagba teszi a jegyzetet, méreteket és az ezen az eszközön elérhető fájlokat. A hiányzó fájlok számát jelzi, nem színlel teljes mentést. Egy csomag legfeljebb 64 MB fájlt tartalmazhat; nagyobb állománynál a fájlok külön letölthetők.

Importáláskor méret-, formátum- és SHA-256 ellenőrzés történik, ZIP-kicsomagolási korláttal. A már meglevő felmérés jegyzetét az import nem írja felül; az egyező azonosítójú helyi fájlokat veszi át. Eltérő tartalmú, egyező fájlazonosító hibát ad. Szerveradatot az import önmagában nem ír.

A böngésző helyi tárhelye nem külön biztonsági mentés. Böngészőadat-törlés vagy eszközcsere előtt a csomagot le kell tölteni. A felület ezt jelzi. A program meglévő gépi fájlt, más app tárhelyét és más böngészőadatot nem töröl.

## Átadás az ajánlatnak

Az Árajánlat készítése kézzel előbb szinkronizálja az adott felmérést, majd külön, nem mentett ajánlatot nyit. Átmásolja a főtételneveket, méreteket, eredeti jegyzeteket, helyi fájlkapcsolatokat és a felmérés azonosítóját/verzióját. A jegyzet és a fotó az irodai ajánlatszerkesztő belső részén érhető el, nem kerül automatikusan az ügyfél-PDF-be.

A 6 × 2 m méretből 12 m² adódik. Árlistasorokat az iroda választ; az átvétel nem talál ki árat, és az árazatlan ajánlat nem véglegesíthető. Az eredeti felmérés megmarad.

## Magyar diktálás és MI – Groq

A megrendelő a Groq ingyenes csomagjának kipróbálását választotta. A kapcsolat saját ERP-kiszolgálón fut, frissen ellenőrzött saját irodai munkamenettel. A kulcs nem kerülhet a frontendbe vagy a repositoryba.

- Magyar hangátirat: Groq whisper-large-v3-turbo, hu nyelvvel, befejezett hangfelvételből. Az átírás az eredeti jegyzet végére kerül; az eredeti hangot nem töröljük automatikusan.
- Jegyzetrendezés: külön, ember által indított művelet. A javaslat előnézetben ellenőrizhető, és csak az „Ellenőriztem, új főtételekként hozzáadom” gomb után kerül az eredeti főtételek mellé. Az eredeti jegyzetet nem írja felül.
- Hiányzó méret vagy anyag tisztázandó marad; a modell nem dönt árakról. A szöveges modell alapértelmezése openai/gpt-oss-20b a Groq szolgáltatásában; ez nem OpenAI API-kapcsolat.
- Ingyenes keretkorlátnál érthető hiba jelenik meg; nincs automatikus fizetős csomagváltás vagy más szolgáltatóra váltás.
- A Groqhoz továbbított hang és jegyzet külső adatfeldolgozás. A szolgáltatási adatkezelési beállításokat a saját Groq-fiókban kell ellenőrizni.

### A valódi MI-próbához még szükséges beállítás

1. Saját Groq-fiók az ingyenes csomagban; a fiók létrehozását és feltételeinek elfogadását a tulajdonos végzi.
2. Saját API-kulcs létrehozása a [Groq konzolban](https://console.groq.com/keys). A kulcsot ne küldd üzenetben.
3. A kizárólag ERP-t kiszolgáló kap projekt Edge Functions → Secrets felületén az **ERP_GROQ_API_KEY** titok beállítása. Meglévő titkot nem írunk felül. A név szándékosan ERP-specifikus, más tesztalkalmazás kulcsát nem vesszük át.
4. Az alkalmazás újranyitása után a saját kiszolgáló jelzi az MI elérhetőségét. Kulcs nélkül az MI-gombok nem jelennek meg, a kézi felmérés használható.

Valódi Groq-próbahívás kulcs nélkül nem történt. A hibakezelés és jogosultságvédelem külső hívást nem végző tesztekkel ellenőrzött. A mikrofon hardveres próbája a felhasználó eszközén szükséges. Folyamatos, élő magyar átirat és a belső árlistához automatikusan hozzárendelt MI-ajánlatgenerálás még nem készült el; ezek nem azonosak a mostani hangfájlból készülő átirattal és kézi ajánlatátadással.

## Műszaki nyilvántartás

Saját új táblák: erp.surveys és erp.survey_versions, FORCE RLS-sel. A szöveges dokumentum fájlazonosítót, formátumot, méretet és ellenőrzőösszeget tartalmazhat, fájltartalmat nem. Az iroda olvasó RPC-it a NOBYPASSRLS erp_api szerep birtokolja, az írás service-only, aktív irodai személy ismételt ellenőrzésével. Az ügyfél és cím kötése létrehozás után nem cserélhető. A korábbi szövegváltozatok megmaradnak.

Új felmérési műveletek az erp-gateway-ben; külön erp-survey-ai funkció a kiválasztott külső szolgáltatáshoz. A saját gateway 12. és az MI-funkció 2. verziója települt. A normál Munkalap-forráshoz csak olvasás történik; KAP/Árajánlat tesztadatot nem használunk.

A telepítés kezdetben a már meglévő, SET ROLE-t nem engedő ERP-tagság miatt megállt és visszagördült. Az ideiglenes szerepátadás saját grantorral történik, majd eltűnik; az eredeti supabase_admin-féle ERP-tagság tulajdonságai megmaradnak. Az olvasófüggvények végrehajtási jogait külön erp_api szerepben szűkítettük. Az éles ellenőrzésben az anonim olvasás és a közvetlen authenticated írás tiltott; új próbaadat nincs.

Új források: src/erp-surveys.ts, erp-survey-model.ts, erp-survey-store.ts, erp-survey-archive.ts; saját SQL-tervek és két saját Edge Function. A build a közös felmérés-ellenőrzőt is generálja a kiszolgálónak. Új helyi csomagtelepítés nincs; a ZIP-hez a meglévő, verziórögzített fflate használható. A service worker csak a saját statikus modulokat tárolja, ügyféladatot vagy API-választ nem.

Ellenőrzés: 175 sikeres teszteredmény; TypeScript-fordítás és gateway/MI-kód típusellenőrzés; elkülönített böngészőben ár nélküli felmérés, valódi helyi IndexedDB-mentés, fotó hozzáadása, újranyitás utáni megmaradás, valamint a jegyzet és fájlkapcsolat kézi ajánlatátadása. Éles kitalált felmérés vagy ajánlat nem készült.

Források a szolgáltatás kiválasztásához: [Groq beszédfelismerés](https://console.groq.com/docs/speech-to-text), [csomagok és számlázás](https://console.groq.com/docs/billing-faqs), [korlátok](https://console.groq.com/docs/rate-limits), [adatkezelés](https://console.groq.com/docs/your-data), [Whisper nyelvek](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py). A szöveges jegyzetek és média közötti különbség, valamint a kézi/MI működés a fejlesztői PDF 7. pontjára és a megrendelő legutóbbi fájltárolási döntésére épül.

A 0.4.1 kiadás a fókuszváltások utáni teljes munkatérfrissítést 30 másodperces időközzel korlátozza. A gyors ismételt fókuszváltás nem indít újra folyton egy betöltést, ezért a menügombot nem blokkolja újra ugyanaz a háttérolvasás. A kézi frissítés változatlan. A 473f641 alapkiadás GitHub Pages közzététele sikeres volt; a 0.4.1 ezt a célzott javítást tartalmazza.

### Nyitott éles ellenőrzés

A 0.4.1 Pages-közzététel sikeres és a menüpont megjelenik, de a menü megnyitásának utolsó éles UI-próbája még függőben van. A helyi próba nem helyettesíti ezt. A tesztlap lehetséges megerősítésének elfogadását az automatikus jóváhagyás nem engedte; a felhasználó távollétében itt megálltunk. A részletes körülményeket a fejlesztési napló rögzíti.
