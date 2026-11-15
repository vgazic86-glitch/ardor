# Ardor — plan razvoja

Ardor je interna web aplikacija salona namještaja za praćenje prodaje, narudžbi, dostava, prometa po zaposleniku i zaliha. Razvija se u fazama: prvo vidljiva aplikacija, zatim prave baze podataka, prijava i automatizacija.

## Faza 1 — Ekrani aplikacije ✅ (završeno)
- Pregled: promet mjeseca, otvorene ponude, nenaplaćeno, graf 12 mjeseci, rang tima, nadolazeće dostave, kategorije, upozorenja.
- Narudžbe: filteri (status, prodavač, mjesec, pretraga), detalji narudžbe, promjena statusa, evidencija uplata, nova narudžba, izvoz CSV.
- Dostave: sedmični raspored, dnevni plan po ekipi, statusi s terena (krenuli / dostavljeno / odgođeno).
- Zaposlenici: promet i cilj po prodavaču, poređenje, obračun provizija, učinak dostavnih ekipa.
- Zalihe: stanje, rezervacije iz otvorenih narudžbi, artikli ispod minimuma.
- Podaci su primjerni (`src/lib/fixtures.ts`), promjene žive samo u pregledniku.

## Faza 2 — Baza podataka ✅ (završeno)
- Netlify Database (Postgres + Drizzle): tablice `employees`, `customers`, `products`, `orders`, `order_items`, `payments`, `deliveries`.
- Serverske funkcije TanStack Starta za čitanje i upis; `src/lib/store.tsx` prelazi na te pozive.
- Početno punjenje baze stvarnim artiklima i zaposlenicima.

## Faza 3 — Prijava i uloge
- ✅ Privremeno: odabir trenutnog zaposlenika u bočnoj traci (localStorage `ardor.me`).
- Netlify Identity: prijava zaposlenika.
- Uloge: voditelj (sve), prodavač (svoje narudžbe i promet), dostava (samo raspored dostava, mobilni prikaz).

## Faza 4 — Kupci i artikli (djelimično ✅)
- Ekran Kupci: karton kupca, historija kupovina, ukupna potrošnja.
- Dodavanje novog kupca iz forme narudžbe.
- ✅ Upravljanje artiklima i cijenama, prijem robe (primke), inventura, kartica artikla, automatsko smanjenje zalihe pri izlazu iz salona.
- ✅ Dodavanje novog kupca iz forme narudžbe.
- ⏳ Ekran Kupci (karton kupca, historija kupovina).

## Faza 5 — Dokumenti i obavijesti
- PDF ponude, predračuna i otpremnice s logom salona.
- SMS/e-mail kupcu dan prije dostave.
- Dnevni izvještaj voditelju (zakazana funkcija).

## Faza 6 — Izvještaji (✅ osnovno)
- Izvještaji po periodu, kategoriji, dobavljaču; marža (nabavna cijena).
- ✅ Realizacija, marža, PDV, naplata, dugovanja i avansi, izvoz u Excel (`/izvjestaji`).
- ⏳ Plan otplate rata po kupcu; izvještaj po dobavljaču.
