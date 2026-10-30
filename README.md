# DÍSZKERTEK

**Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás**

Ez a repository a teljes Díszkertek ERP fejlesztésének és dokumentációjának önálló helye. A követelmény az eredeti, 15 oldalas fejlesztői PDF teljes funkcióköre, a kiegészítésben és a megrendelővel egyeztetett módosításokkal.

## Jelenlegi állapot – 2026. október 30.

**A részletes adatbázisterv elkészült felülvizsgálatra; jóváhagyásra vár. Alkalmazásfejlesztés és adatbázis-telepítés még nem történt.** Ez a repository jelenleg dokumentációt tartalmaz. Még nincs futtatható frontend, bejelentkezés vagy deploymentre kész alkalmazás.

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

## Jóváhagyott irányok

- Magyar felület és folyamatosan magyar nyelvű README, használati és továbbfejlesztési leírással.
- HTML5, CSS3 és moduláris TypeScript már az első alkalmazásverziótól; Supabase PostgreSQL és TypeScript szerveroldali műveletek.
- Teljes PDF-funkciókör: a mérföldkövek munkasorrendet jelentenek, nem csökkentett végterméket.
- Díszkertek-logó zöld négyzetes háttéren; egységes favicon, appikon és linkelőnézet.
- Megjelenő név: DÍSZKERTEK. Felirat: „Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás”.
- Elérhetőségek: +36 70 634 9630; info@diszkertek.hu; www.diszkertek.hu.
- Az új arculat és dokumentumsablonok kizárólag a jóváhagyott Díszkertek-megjelenést használják. A forrásfájlok régi készítői feliratait nem emeljük át.
- A repositoryt és a deploymentet a megrendelő kezeli. Ellenőrzött fejlesztésekhez automatikus commit és push engedélyezett.
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
2. A függő döntések rendezése; az adatbázisterv jóváhagyásáig nincs Supabase-írás.
3. Elkülönített helyi fejlesztőkörnyezet létrehozása, a régi alkalmazásokhoz írási kapcsolat nélkül.
4. A PDF szerinti funkciók megvalósítása TypeScriptben, ellenőrizhető mérföldkövekkel.
5. Minden változtatásnál az érintett funkció, indok, teszt, korlát és adatbázishatás dokumentálása.
6. Futtatható frontend elkészültekor pontos indítási, build- és GitHub-deployment leírás, valamint tényleges képernyőképek hozzáadása.
7. Éles átállás csak mentés, tesztimport, teljes jogosultsági ellenőrzés és külön jóváhagyás után.

A repository dokumentációs állapotában nincs telepítési vagy futtatási parancs: nem állítjuk, hogy az alkalmazás már elkészült.
