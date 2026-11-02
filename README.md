# DÍSZKERTEK

**Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás**

[Alkalmazás megnyitása](https://agnesgeller.github.io/erp/) · **Verzió: 0.3.0**

## Mi használható?

- Ági és Tamás saját irodai belépése, megjegyzett munkamenettel.
- Közös ügyféllista, munkavégzési címek, munkák és munkatársi megbízások.
- Árajánlatkészítés: 163 árazott típus, 22 kategória, három sablon, PDF-letöltés és kézi kiküldés rögzítése.
- Telepítés és frissítés a felső menüből; mobilon is használható felület.

A járdasablon pontosítandó sorait a főnök ajánlatkészítéskor választja ki. A teljes ERP fejlesztése még folyamatban van; a felmérési és MI-funkciók még nem készültek el.

![Az alkalmazás belépési felülete](docs/kepek/kezdo-desktop.png)

## Használat és dokumentáció

- [Belépés](docs/irodai-belepes.md) · [Ügyfelek](docs/ugyfelnyilvantartas.md) · [Munkák](docs/cimhez-kapcsolodo-munkak.md)
- [Árajánlatok, árlisták és sablonok](docs/arajanlatmodul.md)
- [Adatbázisterv](docs/adatbazisterv.md) · [Jogosultságok](docs/szerepkorok.md) · [Excel-kalkulátor](docs/kalkulator-felmeres.md)
- [Fejlesztési napló](docs/fejlesztesi-naplo.md) · [Részletes projektleírás és előzmények](docs/reszletes-projektleiras.md)
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

Legutóbbi ellenőrzés: **2026. november 2., 151 sikeres teszteredmény**, éles PDF-letöltés és mobilnézet ellenőrizve. A teljes üzleti folyamat éles próbája az első valódi ajánlatnál következik. Telepítési és folytatási részletek a [projektleírásban](docs/reszletes-projektleiras.md).

+36 70 634 9630 · [info@diszkertek.hu](mailto:info@diszkertek.hu) · [www.diszkertek.hu](https://www.diszkertek.hu/)
