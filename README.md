# Ardor — praćenje prodaje i dostava

Interna web aplikacija salona namještaja **Ardor**: narudžbe, dostave i montaža, promet po zaposleniku, provizije i zalihe na jednom mjestu.

## Ekrani
**Prodaja**
- **Pregled** (`/`) — ključni brojevi mjeseca, grafovi prometa, tim, nadolazeće dostave, upozorenja.
- **Narudžbe** (`/narudzbe`) — lista s filterima, „Moje prodaje”, detalji, statusi, uplate, nova prodaja, CSV izvoz.
- **Dostave** (`/dostave`) — sedmični raspored i dnevni plan po ekipi.

**Roba**
- **Zalihe** (`/zalihe`) — stanje, rezervisano, slobodno, vrijednost po nabavnoj, lista za naručiti po dobavljaču, kartica artikla sa svim kretanjima.
- **Prijem robe** (`/primke`) — primke od dobavljača (dokument, količine, nabavne cijene, PDV); roba odmah ulazi na zalihu.
- **Artikli** (`/artikli`) — šifrarnik s cijenama, maržom, minimalnom zalihom, dobavljačem; novi / uredi / arhiviraj.
- **Inventura** (`/inventura`) — upis prebrojanih količina, manjak/višak, knjiženje korekcija odjednom.

**Poslovanje**
- **Izvještaji** (`/izvjestaji`) — realizacija po periodu, nabavna vrijednost, bruto marža, PDV (izlazni − ulazni), naplata po načinu plaćanja, potraživanja i avansi, marža po kategoriji/prodavaču/artiklu, izvoz u Excel (10 listova).
- **Zaposlenici** (`/zaposlenici`) — promet, ciljevi, provizije; dodavanje i uređivanje zaposlenika.
- **Dobavljači** (`/dobavljaci`) — kontakti, rokovi isporuke, nabava i zaliha po dobavljaču.

**Ljudi i dokumenti**
- **Kadrovska** (`/kadrovska`) — zaštićeno upravljačkom lozinkom: ugovori o radu i ostali dokumenti zaposlenika (PDF/Word/slike do 4 MB, upozorenje 30 dana prije isteka), plaće s historijom (bruto, neto, topli obrok, prijevoz), mjesečni prijedlog bonusa — fiksni + varijabilni dio, odobravanje i Excel; podesiva pravila.
- **Dokumenti** (`/dokumenti`) — Kodeks ponašanja, Knjiga grafičkih standarda, Priručnik za prodavače, Standard dostave i montaže, Procedura reklamacija i povrata, Uvod za nove zaposlenike; čitanje, ispis/PDF, uređivanje (lozinka), novi dokumenti i prilozi.

**Upravljačka lozinka:** postavlja se pri prvom otvaranju Kadrovske (ili varijablom okruženja `ADMIN_LOZINKA`). Plaće i ugovori nikad nisu u javnom dijelu podataka — server ih vraća samo uz važeću prijavu (token 12 h).

Ostalo: brza pretraga **Ctrl+K**, odabir „ko radi u aplikaciji” dolje lijevo (pamti se u pregledniku), obavijesti o spremanju.

Podaci se čuvaju u Netlify Database (Postgres). Pri prvom pokretanju baza se puni primjernim podacima.

## Tehnologije
TanStack Start (React 19), Tailwind CSS 4, Chart.js, lucide-react, write-excel-file, Netlify Database + Drizzle.

## Lokalno pokretanje
```bash
pnpm install
netlify dev   # ili: pnpm dev
```

## Plan
Sljedeće faze (baza podataka, prijava zaposlenika, kupci, PDF dokumenti, obavijesti, izvještaji) opisane su u [PLAN.md](./PLAN.md).

## Objava na Renderu
`render.yaml` opisuje cijelu postavku (web servis + Postgres, Frankfurt). U Renderu: **New → Blueprint** → odaberite ovaj repozitorij → **Apply**.
Pri pokretanju `npm run start` primijeni SQL migracije iz `netlify/database/migrations` i, ako je baza prazna, napuni je primjernim podacima.
Lokalno kao na Renderu: `DATABASE_URL=postgres://… pnpm build:node && pnpm start`.
