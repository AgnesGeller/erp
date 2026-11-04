# DÍSZKERTEK

**Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás**

[Alkalmazás megnyitása](https://agnesgeller.github.io/erp/) · **Verzió: 0.11.0**

## Mi használható?

- Saját irodai és ügyfélbelépés; az iroda pipával jelöli ki a látható címeket, a meghívót kézzel küldi.
- Közös ügyféllista, munkavégzési címek, munkák és munkatársi megbízások.
- Helyszíni felmérés: kézi jegyzetek, méretek, helyi fotók/hangok, letölthető csomag és kézi ajánlatátadás.
- Árajánlatkészítés: 163 árazott típus, 22 kategória, három sablon, frissülő PDF-előnézet, tételtörlés/visszavonás és választható kézi levelezés.
- Részletes munkaterv, négyszintű átvétel, megosztás, javítási teendők és saját dolgozói belépés.
- Nyolcféle bejegyzés, kétoldalú változásjóváhagyás, megőrzött előzmények és helyi fotócsomagok.
- Saját kertépítési munkalap, személyenként eltérő idő, átfedésjelzés, visszavonás/visszaállítás és tényleges munkaidő az ötödik sávon.
- Anyagbeszerzés: részszállítás, telephelyi átvétel, szállítás, beépítés, extra anyagok, összevont lista és védett belső költségszámítás.
- Pénzügyi elszámolás: előleg, részfizetés, irodai igazolás, belső eredmény és külön éves jutalék.
- Telepítés és frissítés a felső menüből; mobilon is használható felület.

[Munkaterv és átvétel](docs/munkaterv-es-atvetel.md) · [Bejegyzések és változásjóváhagyás](docs/bejegyzesek.md). [Munkalap és munkaidő](docs/munkalap-munkaido.md). [Anyagkezelés és kipróbálás](docs/anyagkezeles.md) · [Rövid vezetői összefoglaló](docs/mai-fejlesztesek-2026-11-03.md). [Pénzügyi elszámolás és kipróbálás](docs/penzugyi-elszamolas.md). Következik a teljes kertkarbantartási munkalap és elszámolása.

A járdasablon pontosítandó sorait a főnök ajánlatkészítéskor választja ki. A teljes ERP fejlesztése még folyamatban van; a Groq MI-próbájához saját szerveroldali kulcs szükséges.

![Az alkalmazás belépési felülete](docs/kepek/kezdo-desktop.png)

## Használat és dokumentáció

- [Irodai belépés](docs/irodai-belepes.md) · [Ügyfélbelépés és saját munkák](docs/ugyfelbelepes.md) · [Ügyfelek](docs/ugyfelnyilvantartas.md) · [Munkák](docs/cimhez-kapcsolodo-munkak.md)
- [Felmérések és helyi fájlok](docs/felmeresek.md) · [Árajánlatok, árlisták és sablonok](docs/arajanlatmodul.md)
- [Adatbázisterv](docs/adatbazisterv.md) · [Jogosultságok](docs/szerepkorok.md) · [Excel-kalkulátor](docs/kalkulator-felmeres.md)
- [Fejlesztési napló](docs/fejlesztesi-naplo.md) · [Részletes projektleírás és előzmények](docs/reszletes-projektleiras.md)
- [A fejlesztői PDF teljesítési állapota és hátralévő modulok](docs/specifikacio-allapot.md)
- [Menthető PDF-pillanatképek](output/pdf/) – korábbi dokumentációs változatok.

A Munkalap az elsődleges ügyféllista. Az ERP új ügyfelet és első címet a külön engedély szerint menthet bele; meglévő forrásadatot nem ír át. A többi alkalmazás kódja és adatbázis-szerkezete változatlan. Ügyféladat, belső árlista és jelszó nem kerülhet a GitHubra.

## Fejlesztés

HTML, CSS és TypeScript; Supabase, saját ERP-sémákkal. Követelmény: az eredeti fejlesztői PDF és a jóváhagyott kiegészítések teljesítése.

Az ERP saját mappájában, meglévő fejlesztői függőségekkel:

```sh
npm run build
npm test
npm run check:edge
```

Legutóbbi teljes ellenőrzés: **2026. november 4., 424 sikeres teszt**, TypeScript-fordítás és helyi böngészőpróba. A teljes üzleti lánc átadási próbája a hátralévő modulok elkészülése után következik.

+36 70 634 9630 · [info@diszkertek.hu](mailto:info@diszkertek.hu) · [www.diszkertek.hu](https://www.diszkertek.hu/)

Számok: fölösleges tizedesnullák nélkül, legfeljebb két tizedessel; a belső számítás pontos marad.

A felugró ablakok jobb felső × gombbal bezárhatók; a jelszókérések betöltése is megszakítható.
