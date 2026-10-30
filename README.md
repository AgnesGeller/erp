# DÍSZKERTEK

**Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás**

Ez a repository a teljes Díszkertek ERP fejlesztésének és dokumentációjának önálló helye. A követelmény az eredeti, 15 oldalas fejlesztői PDF teljes funkcióköre, a kiegészítésben és a megrendelővel egyeztetett módosításokkal.

## Jelenlegi állapot – 2026. október 30.

**A jelenlegi frontend-verzió 0.1.3:** Díszkertek-arculat, kezdőképernyős telepítés és frissítés, belépéstől függetlenül. A teljes ERP üzleti moduljai és a bejelentkezés még nem készültek el. A kap projektben az elkülönített ERP-adatbázis alapja és az irodai tagság létrejött; az ERP-belépés még nem működik, az ellenőrzése befejezésre vár. Az ERP saját sémái a meglévő kap projektbe kerülhetnek a jóváhagyott terv szerint.

[Alkalmazás megnyitása](https://agnesgeller.github.io/erp/) · A webcímen az index.html jelenik meg, a műszaki dokumentáció itt, a GitHubon olvasható.

![A tényleges kezdőfelület és a sikeres frissítésellenőrzés](docs/kepek/kezdo-desktop.png)

Az adatbázisterv nem végrehajtható migráció, és a leírt megoldás nem tekinthető már működő integrációnak. Az eredeti munkafüzeteket, ügyféladatokat és adatbázis-mentéseket nem töltjük a repositoryba.

## Röviden, nem fejlesztőknek

A dolgozók az átállásig a mostani alkalmazásaikat használják. Az új rendszerben az ügyfél felvételétől a helyszíni felmérésen, ajánlaton és munkavégzésen át az elszámolásig, fizetésig és referencia elkészítéséig követhető lesz a munka.

Egy ügyfélnek több munkavégzési címe lehet. Egy címhez több kertépítés és karbantartás tartozhat. Az ügyfél neve, az elvégzett munka értéke és a tényleges befizetés külön adat: ezeket összekapcsoljuk, de nem számoljuk kétszer ugyanazt az összeget.

![A meglévő rendszerek és az ERP tervezett adatkapcsolatai](docs/kepek/adatkapcsolatok.svg)

Az ábra tervet mutat. A szaggatott vonalak még nem létező ERP-kapcsolatokat jelölnek.

## Dokumentáció

- [Részletes adatbázisterv](docs/adatbazisterv.md): elhelyezés, táblák, jogosultságok, szinkron, pénzügyek, mentés, átállás, ellenőrzések.
- [A csatolt árajánlat-kalkulátor felmérése](docs/kalkulator-felmeres.md): ellenőrzött képletek, 163 árlistasor, 22 kategória, sablonok és megfeleltetési problémák.
- [Fejlesztési napló és döntések](docs/fejlesztesi-naplo.md): mi készült el, mi jóváhagyott, mi vár döntésre, és hogyan ellenőriztük.

## Menthető PDF-változatok

- [Részletes adatbázisterv - PDF](output/pdf/01_Diszkertek_reszletes_adatbazisterv.pdf)
- [Magyar README és adatkapcsolati ábra - PDF](output/pdf/02_Diszkertek_magyar_README.pdf)
- [Kalkulátor-felmérés és fejlesztési napló - PDF](output/pdf/03_Diszkertek_kalkulator_es_fejlesztesi_naplo.pdf)

A PDF-ek a dokumentáció menthető pillanatképei. A továbbfejlesztéshez az aktuális Markdown-forrásokat is meg kell őrizni.

## Jóváhagyott irányok

- Magyar felület és folyamatosan magyar nyelvű README, használati és továbbfejlesztési leírással.
- HTML5, CSS3 és moduláris TypeScript már az első alkalmazásverziótól; Supabase PostgreSQL és TypeScript szerveroldali műveletek.
- Teljes PDF-funkciókör: a mérföldkövek munkasorrendet jelentenek, nem csökkentett végterméket.
- A weboldalon háttér nélküli Díszkertek-logó; a favicon és a telepített alkalmazás ikonja zöld négyzetes háttérrel.
- Megjelenő név: DÍSZKERTEK. Felirat: „Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás”.
- Elérhetőségek: +36 70 634 9630; info@diszkertek.hu; www.diszkertek.hu.
- Az új arculat és dokumentumsablonok kizárólag a jóváhagyott Díszkertek-megjelenést használják. A forrásfájlok régi készítői feliratait nem emeljük át.
- A repositoryt és a deploymentet a megrendelő kezeli. Ellenőrzött fejlesztésekhez automatikus commit és push engedélyezett.
- Az ERP saját sémái a meglévő kap Supabase-projektbe kerülhetnek; a közös ügyféltörzs a Munkalapban marad.
- Az első Iroda jogosultságú ERP-fiók jóváhagyott e-mail-címe: info@diszkertek.hu. A meglévő igazolt fiókhoz külön ERP-tagság kapcsolódik; a bejelentkezési felület és ellenőrzés még nincs kész.
- Új előfizetés nem indítható. Használati díjas külső szolgáltatás sem aktiválható előzetes egyeztetés nélkül.

## A meglévő működés védelme

A Kassza, Munkabér, Munkalap és Napi feladatok forráskódja és meglévő adatbázis-objektumai ebben a munkában nem módosulnak. A Munkalapban kialakított közös ügyféltörzs az elsődleges forrás.

A Kassza és a Munkabér pénzügyi funkcióit nem integráljuk az ERP-be. Az ERP saját elszámolásokat, befizetés-visszaigazolásokat és jutalékanalitikát kezel. A közös ügyféladatok kapcsolatát ettől külön megőrizzük.

A munkatársak közötti pénzátadás és pénzátvétel nem számít új céges bevételnek vagy költségnek.

## Adatvédelem és GitHub

A frontend kódja publikus tárhelyen is megjelenhet. Sem ügyféladat, sem belső árlista, hang, munkalap, PDF, eredeti Excel, adatmentés, API-titok vagy jelszó nem kerülhet a repositoryba. A tényleges árlista hitelesített, jogosultságokkal védett importtal kerül majd az adatbázisba.

A forrásokból átvett számítási szabály és a belső adat két külön dolog. A matematikai logika tesztelhető kitalált tesztértékekkel; ilyen tesztadat a végfelhasználói felületen nem jelenhet meg.

## Hogyan folytatható a fejlesztés?

1. A fejlesztési napló és a teljes adatbázisterv elolvasása.
2. A jóváhagyott elhelyezési irány műszaki megvalósítása és elkülönített jogosultsági tesztjei; ellenőrzés nélkül nincs éles telepítés.
3. Elkülönített helyi fejlesztőkörnyezet létrehozása, a régi alkalmazásokhoz írási kapcsolat nélkül.
4. A PDF szerinti funkciók megvalósítása TypeScriptben, ellenőrizhető mérföldkövekkel.
5. Minden változtatásnál az érintett funkció, indok, teszt, korlát és adatbázishatás dokumentálása.
6. Futtatható frontend elkészültekor pontos indítási, build- és GitHub-deployment leírás, valamint tényleges képernyőképek hozzáadása.
7. Éles átállás csak mentés, tesztimport, teljes jogosultsági ellenőrzés és külön jóváhagyás után.

## Fejlesztés, ellenőrzés és GitHub Pages

Node.js 20.12 vagy újabb szükséges. Mindig az **erp repository saját könyvtárában** dolgozz; csomagtelepítés előtt ellenőrizd az npm prefix eredményét.

1. `npm ci` – kizárólag helyi fejlesztői függőségek telepítése, nincs fizetős szolgáltatás.
2. `npm run build` – src/main.ts fordítása assets/js/main.js fájlba. A fordított fájl is verziókezelt, a Pages nem igényel Node.js futtatást.
3. `npm test` – a telepítés/frissítés siker- és hibaágai, valamint a más appokat védő gyorsítótár-izoláció ellenőrzése.
4. `python -m http.server 5188 --bind 127.0.0.1` – helyi megnyitás: http://127.0.0.1:5188/. A teszt végén Ctrl+C-vel állítsd le.
5. Commit és push közvetlenül a main ágra, majd a Pages-telepítés ellenőrzése. A forrás a main ág gyökérmappája; az index.html az alkalmazás kezdőlapja, a .nojekyll kikapcsolja a dokumentációs Jekyll-feldolgozást.

Új kiadáskor együtt módosítandó: package.json és package-lock.json verziója, version.json, src/main.ts két verziószövege és sw.js CACHE_NAME értéke; ezután újrafordítás és teszt.

## Letöltés és frissítés használata

- **Alkalmazás letöltése:** a böngésző saját telepítőjét nyitja meg, ha támogatott és elérhető. Sikeres telepítéskor zöld pipa jelenik meg. Az ablak elfogadása önmagában még nem jelenti a telepítés befejezését.
- Ha nincs közvetlen telepítő, magyar útmutató segít. iPhone/iPad esetén Safari → Megosztás → Főképernyőhöz adás. Ez nem külön APK vagy alkalmazásbolti kiadás.
- **Frissítés:** interneten ellenőrzi a kiadást és a service workert. Ha nincs új verzió, zöld pipás „Sikeres ellenőrzés. Az alkalmazás naprakész.” jelzés látszik. Elérhető frissítés betöltése után „Sikeres frissítés.” jelenik meg.
- Hálózati vagy telepítési hibánál nincs téves sikerjelzés; a gomb újra használható.
- Kizárólag a saját ERP statikus fájljai kerülnek gyorsítótárba. Ügyféladatot, API-választ és más alkalmazás gyorsítótárát ez a verzió nem tárolja és nem módosítja.

A tényleges Chrome/Edge és iOS kezdőképernyős telepítést még külön eszköztesztnek kell igazolnia. Az alkalmazáson belüli böngészőben a telepítési útmutató és a frissítésellenőrzés működését ellenőriztük.

## Ikonok és dokumentáció újraelőállítása

Az ikonok a meglévő Díszkertek-logóból, zöld háttérrel készültek; a PNG-k a repositoryban vannak. Újragenerálás: `node tools/generate-icons.mjs <sharp-modul-abszolút-elérési-útja> <eredeti-logo.png>`. A sharp csak eseti képelőállító eszköz, a webalkalmazás nem tölti be.

A három PDF újraelőállítása: `python tools/render-docs.py` (reportlab szükséges; magyar Arial betűkészlettel). Kimenet: output/pdf. A képernyőképek valódi böngészős felvételek.

A kap projekt Árajánlat alkalmazása friss **tesztalkalmazás**. Az új ERP elkészülése és az átvétel ellenőrzése után eltávolítható, a már kiküldött PDF és a szükséges adatok megőrzésével. Ebben a fejlesztési lépésben nem töröltünk belőle semmit.


### 0.1.1 – Logómegjelenítés pontosítása

A fejlécben és a kezdőfelületen az eredeti átlátszó logó jelenik meg, zöld négyzet nélkül. A favicon, a telepítési ikonok és a linkelőnézet változatlanok. A korábbi PDF-ek és képernyőképek az első változat pillanatképei.


### Megosztási előnézet pontosítása

A megosztási kép világos hátterű, nagy, eredeti Díszkertek-logóval. A név és a teljes alkalmazásleírás a link metaadataiban szerepel; a képen nincs ismételt apró felirat. Az új megosztas-v2.png képnév segíti a frissítést. A már elküldött Viber-üzenetek előnézetét a Viber saját gyorsítótára őrizheti; ezek utólagos frissülése nem garantálható.


### 0.1.2 – Felső alkalmazásmenü

A Telepítés és Frissítés gomb a felső menüben, bejelentkezés előtt is elérhető. Mobilon két legalább 48 képpont magas gomb jelenik meg. A telepítőablakot támogató böngészőben a saját telepítő nyílik meg; más környezetben iPhone/iPad, Android, Mac, asztali gép vagy beágyazott böngésző szerinti lépések láthatók. A sikeres telepítést csak visszaigazolás után jelezzük. A natív telepítés böngészőfüggő; a reszponzív webes működés ettől független.


### 0.1.3 – Saját ERP-telepítési azonosító

A működő Napi feladatok, Munkalap, Kassza és Munkabér forrását kizárólag olvasással hasonlítottuk össze. Az ERP a Napi feladatok mintájára kifejezett **/erp/** telepítési azonosítót kapott. A korábbi ./ azonosító a manifest szabványa szerint a domain gyökerére oldódott fel, ezért másik appal azonosnak minősülhetett. A scope is /erp/; ez a két beállítás eltérő szabályok szerint oldódik fel.

A Munkalap és a többi működő app mintájára az indítóoldal, a CSS, a JavaScript, a manifest és a service worker verzióparamétert használ. A Frissítés csak a kért verzió tényleges betöltése után jelez sikeres frissítést. Az ERP kizárólag saját gyorsítótárát kezeli.

[Részletes telepítési összehasonlítás](docs/telepitesi-osszehasonlitas.md). Helyi, a valódi /erp/ útvonalat követő előnézet: `python tools/preview.py`, majd http://127.0.0.1:5194/erp/. Az előnézet más appok mappáit nem szolgálja ki.

Ellenőrzés: TypeScript-build, 14 célzott automatikus teszt, böngészős frissítésellenőrzés. A valódi Chrome/Edge telepítés befejezését külön eszközpróba igazolhatja; az eseményszimuláció ezt nem helyettesíti.
