# Ági és Tamás saját ERP-belépése

Verzió: 0.1.5 · 2026. október 30.

## Használat

A belépés névválasztásból és saját, 6–12 számjegyű ERP PIN-ből áll. Ági és Tamás két külön ERP-fiókot kapott. A PIN-eket a megrendelő adta meg, védett, maszkolt bevitellel kerültek a két új fiókhoz. PIN, jelszó, nyílt beállító token és API-titok nem szerepel a repositoryban vagy a dokumentációban.

Az első sikeres belépés után az eszköz az ERP saját megújító munkamenettokenjét őrzi meg. Újranyitáskor a kiszolgáló újra ellenőrzi a fiókot és az aktuális ERP-jogosultságot. A Kijelentkezés eltávolítja a megjegyzett ERP-belépést, és csak ezt a kiszolgálói munkamenetet zárja le. A böngésző adatainak törlése, privát böngészés, lejárt/visszavont munkamenet vagy másik eszköz ismételt PIN-bevitelt igényelhet. Offline állapotban nem állítunk sikeres jogosultság-ellenőrzést.

A böngésző saját jelszómentési ajánlatát a weboldal nem tudja kikényszeríteni. Az automatikus ERP-megnyitáshoz nem szükséges olvashatóan eltárolni a PIN-t.

## Önállóság és tárhely

Az új fiókok belső technikai azonosítói agi@erp.diszkertek.hu és tamas@erp.diszkertek.hu. Nem postaládák, e-mailt nem küldtünk hozzájuk. A felületen a személy neve jelenik meg. A kap projekt infrastruktúráját használjuk, de korábbi KAP-fiókot vagy üzleti adatot nem veszünk át. Azonos céges e-mailből nem következtetünk közös felhasználói fiókra.

Csak a korábban tévesen hozzákapcsolt info@diszkertek.hu fiók ERP user_accounts sorának active értéke lett false. Az Auth-fiók, annak jelszava és más alkalmazásbeli hozzáférése változatlan. Más ERP-tagságot nem inaktiváltunk. A történeti ERP-személy és napló megmaradt.

## Szerveroldali működés

- Új erp_private.office_logins tábla: a jóváhagyott két irodai azonosító, saját ERP-személykapcsolat, egyszeri beállítás lenyomata/lejárata és a belépési próbálkozások számlálója. RLS és FORCE RLS; közvetlen hozzáférése nincs sem az anon/authenticated, sem a service_role szerepnek.
- Öt új erp_office_* adminisztratív RPC-t kizárólag service_role hívhat. Rögzített, üres search_path; teljesen minősített objektumnevek. Ezek szándékosan adminisztratív SECURITY DEFINER függvények, nem az authenticated szerepnek megnyitott általános üzleti API. A saját privát táblát kezelik, és nem fogadnak tetszőleges másik alkalmazásból átvett fiókot.
- Az ERP-gateway az első beállításkor véletlen, 256 bites, legfeljebb egy órára kiadott egyszeri titokkal és adatbázisban zárolt foglalással hozhat létre saját Auth-fiókot. Az adatbázis csak SHA-256-lenyomatot tárol; a sikeres beállítás után a titkot érvényteleníti. A fiók szerver által kezelt app_metadata jelölése és saját generációazonosítója kötelező. Felhasználó által írható user_metadata nem jogosultsági bizonyíték.
- Megszakadt létrehozás csak ugyanezen ERP-beállítás saját, még nem aktivált fiókját folytathatja. Másik, már létező Auth-fiók átvételét a végső adatbázis-ellenőrzés is elutasítja.
- A szerveroldali service_role kulcs csak ehhez a szűk irodai előkészítéshez és a belépési próbálkozások adminisztratív ellenőrzéséhez használható. Nem kerül a frontendbe. A normál üzleti RPC-k változatlanul a tényleges felhasználó JWT-jével, a szűk NOLOGIN/NOBYPASSRLS szereppel és FORCE RLS-sel futnak.
- A login művelet csak agi/tamas névazonosítót fogad el; a korábbi közös info@ e-mail nem belépési azonosító. Öt próbálkozás után 15 perces korlátozás lép életbe; sikeres belépés a számlálót visszaállítja.

## Eszköztárolás

Kulcs: diszkertek-erp-office-session-v1. Tartalom: verzió és refresh_token. Nincs benne PIN, access token, ügyféladat vagy megbízhatónak tekintett irodai szerepkör. Sérült tároló törlése csak ezt az ERP-kulcsot érinti. Lejárt vagy visszavont munkamenet elfelejtődik; átmeneti hálózati hiba után a megújítás újrapróbálható. Kijelentkezés után későn visszaérő válasz nem nyithatja újra a munkateret.

A GitHub Pages azonos domainjén lévő alkalmazások böngészőtárhelye technikailag közös eredetű. A saját kulcsnév az alkalmazások véletlen összekeverését akadályozza meg, nem jelent külön böngészőeredetű biztonsági határt. Az API a fiókot és ERP-tagságot ettől függetlenül ellenőrzi.

## Telepítés és bizonyíték

Új migráció: erp_dedicated_office_accounts; forrása database/proposals/erp-office-login.sql. A korábbi három ERP-alapmigráció után alkalmazandó, meglévő DÍSZKERTEK szervezettel. Új környezetben az alap szervezeti rekord létrehozása külön, ellenőrzött lépés. Már telepített környezetben a migráció nem futtatható újra vakon.

73 automatikus teszteredmény sikeres: jogosultságok, névhez kötött új fiókok, tiltott régi fiókátvétel, egyszeri beállítás, párhuzamos foglalás, próbálkozási korlát, megjegyzett munkamenet, hálózati hiba, kijelentkezés és PWA-frissítés. A két tényleges új fiók HTTPS-belépése, irodai adatolvasása és helyi kijelentkezése sikeres. A localhost eredetre adott CORS-előkérés 204 és a helyes Access-Control-Allow-Origin érték.

A meglévő nem ERP public táblák jogosultsági/RLS-lenyomata, public szabályai és nem ERP public/quote_private függvényei változatlanok. A korábbi Auth-fiókok id/updated_at ellenőrzőlenyomata a két új ERP-fiókot kizárva változatlan: 92657c94a023a0daa5e2eaa455b4fa27. Ezek szerkezeti/állapot-ellenőrzések, nem a többi alkalmazás teljes újratesztelése.

A saját privát adminisztratív tábla policy nélküli FORCE RLS-védelme tudatos; csak a fenti szűk szerveroldali függvények kezelik. A korábbi projektfigyelmeztetések megmaradnak. [Supabase RLS-ellenőrző leírása](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

A beépített ellenőrző böngésző a külső API-hoz kapcsolódási hibát jelzett. Ezért az automatikus újranyitás tényleges Chrome/Edge/telefonos eszközpróbája még szükséges; a működő HTTPS és a helyi automatikus teszt nem helyettesíti ezt. Az ügyfél/dolgozói e-mailes belépés most nincs bekapcsolva. Üzleti adatimport nem történt.
