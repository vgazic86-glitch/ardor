# ARDOR namještaj — interni ERP salona

Interna web aplikacija salona namještaja **ARDOR** (Banja Luka): prodaja, narudžbe kupaca, nabava od dobavljača, zalihe, dostave i montaža, reklamacije, kupci, izvještaji, troškovi i zarada, kadrovska, zadaci, korisnici i dnevnik izmjena.

- Uživo: https://ardor-4mdu.onrender.com (Render, Frankfurt). **Push na `main` = objava uživo** (Render auto-deploy).
- Repo: https://github.com/vgazic86-glitch/ardor
- Vlasnik projekta: Vladimir (korisnik `vladimir`, uloga admin). Nije programer: objašnjavaj jednostavno.
- Dokumenti, priručnici i alati koji **nisu u repou**: `../ardor-handoff/` (vidi `HANDOFF.md` tamo).

## Jezik

- Svi tekstovi u aplikaciji su na **bosanskom (ijekavica)**: `lang="bs"`, „sedmica”, „artikal”, „dobavljač”, „uplata”. Ne miješaj s engleskim.
- Valuta **KM**, PDV **17 %**; maloprodajne cijene uključuju PDV (`src/lib/format.ts`: `CURRENCY`, `VAT_RATE`, `netOf`).
- Vremenska zona poslovanja: `Europe/Sarajevo`.
- S Vladimirom razgovaraj na hrvatskom/bosanskom, kratko i konkretno.
- Commit poruke piši na bosanskom, jednom rečenicom što je novo za korisnika (kao postojeća povijest, npr. „Promjene cijena: historija, oznaka nova cijena, obavijest u zvoncu”).

## Naredbe

Node 22.13+ ili 24 (Render koristi 24), pnpm **12.21.0** (`npm i -g pnpm@12.21.0`).

```bash
pnpm install
pnpm migrate          # primijeni SQL migracije na DATABASE_URL (čita .env)
pnpm dev              # razvoj s hot reloadom, http://localhost:3000 (čita .env)
pnpm typecheck        # tsc --noEmit — mora proći bez grešaka
pnpm test             # vitest (src/**/*.test.ts) — trenutno 29 testova
pnpm build:node       # produkcijski build za Node/Render (DEPLOY_TARGET=node)
pnpm start:lokalno    # migracije + produkcijski server iz dist/ na :3000 (čita .env) — kao Render
pnpm start            # isto, ali za Render (PORT i DATABASE_URL iz okruženja) — lokalno ne treba
npx drizzle-kit generate --name kratki_opis   # nova migracija iz db/schema.ts
```

- Lokalne postavke su u `.env` (predložak `.env.example`; `.env` se ne commita). Skripte ga čitaju preko `node --env-file-if-exists=.env`.
- `pnpm-workspace.yaml` ima `shellEmulator: true`, pa skripte (`VAR=x naredba`, `${PORT:-3000}`) rade i na Windowsu.
- Skillovi u `.claude/skills/`: `provjera` (prije svakog commita), `objava` (push na Render), te TanStack Start upute (rute, server funkcije, loaderi).

| Varijabla | Obavezno | Značenje |
| --- | --- | --- |
| `DATABASE_URL` | da | Postgres. Lokalno npr. `postgres://postgres:postgres@localhost:5432/ardor`. SSL se uključuje sam za render.com/neon. |
| `PORT` | ne | port za `pnpm start` (Render ga postavlja). |
| `SESSION_SECRET` | ne | ključ za potpis sesija; bez njega se generira i sprema u `app_meta`. |
| `ADMIN_LOZINKA` | ne | upravljačka lozinka (Kadrovska) i rezervni aktivacijski kod za admina. |
| `ANTHROPIC_API_KEY` | ne | AI asistent; bez ključa asistent pretražuje pomoć lokalno. |
| `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL` | ne | model (default `claude-haiku-4-5`) i adresa API-ja. |

## Stack

TanStack Start 1.169 (React 19, file routes) · Vite 8 · Tailwind 4 · Drizzle ORM 1.0 beta + Postgres (`pg`) · srvx · pdf-lib + fontkit (fontovi Ubuntu u `public/brand/fonts`) · qrcode · write-excel-file · chart.js · lucide-react · vitest · Playwright.

## Struktura

```
db/schema.ts            sve tablice (Drizzle)
db/seed.ts              primjerni podaci (pune se pri prvoj prijavi na praznu bazu)
db/documents.ts         početni tekstovi firminih dokumenata (Markdown)
db/index.ts             konekcija: DATABASE_URL → pg Pool, inače Netlify DB
netlify/database/migrations/<timestamp>_<ime>/migration.sql   SQL migracije (izvor istine za bazu)
scripts/migrate.mjs     primjenjuje migracije (tablica _ardor_migrations), dijeli na "--> statement-breakpoint"
src/routes/             stranice (ASCII slug, bosanski naslov). routeTree.gen.ts se generira — NE uređuj ručno
src/server/api.ts       SVE server funkcije (createServerFn) + middleware authed / operations / manager
src/server/*.ts         logika po područjima: logic (snimak, narudžbe, artikli, zalihe), auth, audit, hr, finance,
                        ops (nabava), sales, tasks, complaints, daydocs, pdf, letter, images, assistant
src/lib/                čista logika i tipovi: types, format, stats, reports, ledger, kuf, profit, bonus,
                        worktime, alerts, access, help, store (React kontekst), remote (useRemote)
src/components/         AppShell (meni, zvono, sat, asistent), ui.tsx, Modal (portal), OrderDrawer,
                        NewOrderDialog, Help, Assistant, PriceChanges, QrScanner …
public/brand/           logo, knjiga grafičkih standarda, fontovi
```

## Recept: nova funkcija

1. **Baza** — izmijeni `db/schema.ts`, pa `npx drizzle-kit generate --name opis`. Pregledaj generirani `migration.sql`. Migracije se primijene same pri `pnpm start` (i na Renderu). Postojeće migracije se nikad ne mijenjaju.
2. **Server** — logika u `src/server/<podrucje>.ts`, izložena kroz `src/server/api.ts`:
   ```ts
   export const nestoFn = createServerFn({ method: 'POST' })
     .middleware([operations])          // authed | operations | manager — prema ulozi
     .validator(pass<{ id: string }>())
     .handler(async ({ data, context }) => ...)
   ```
   **Svaka funkcija koja mijenja podatke mora dobiti red u `MAP` u `src/server/audit.ts`** (entitet, radnja, opis) — inače se ne vidi u dnevniku izmjena.
3. **Klijent** — podaci iz glavnog snimka idu kroz `src/lib/store.tsx` (`useStore`), ostalo kroz `useRemote` (`src/lib/remote.ts`; `run()` vraća `true` za void rezultat).
4. **Stranica** — nova ruta u `src/routes/`, stavka menija u `AppShell.tsx` (`groups`), područje u `src/lib/access.ts`, tema pomoći u `src/lib/help.ts` (stranica Pomoć, `?` u prozorima, AI asistent čita isto).
5. **Testovi** — čistu matematiku (novac, PDV, zalihe, rokovi) stavi u `src/lib/*.ts` i pokrij u `*.test.ts`.
6. **Provjera** — skill `provjera`: `pnpm typecheck && pnpm test && pnpm build:node`, zatim `pnpm start:lokalno` i prođi stranicu kao **admin** i kao **trgovac** (druga uloga vidi manje).

## Uloge (server je izvor istine)

| Uloga | Vidi / smije |
| --- | --- |
| `admin` | sve, uključujući Korisnike i pristup |
| `uprava` | sve osim korisnika (zarada, plaće, troškovi) |
| `voditelj` | voditelj salona: promet tima, pazar, nabava, roba, zadaci trgovcima; bez zarade, plaća, troškova, izvještaja |
| `operativa` | primke, nabava, kartice dobavljača, artikli, inventura; bez tuđeg prometa i zarade |
| `trgovac` | prodaja u svoje ime, kupci, reklamacije, katalog, dostave, zalihe **bez nabavnih cijena**; popust najviše **10 %** (provjera u `api.ts`) |

`auth.ts`: `isFull` (admin/uprava), `requireOperations` (svi osim trgovca), `requireManager` (puni uvid), `requireAdminUser`. Trgovac i operativa dobijaju okrnjen snimak (`logic.forTrader`). Plaće i ugovori **nikad** ne idu u snimak.

## Poslovni pojmovi

- **Prodaja** (`/narudzbe`, gumb „Nova prodaja”) — dogovor s kupcem. Tok statusa: `ponuda → potvrđena → u_izradi → spremna → isporučena` (ili `otkazana`). Dostava `dostavljeno` ⇄ prodaja `isporučena`.
- **Narudžbe kupaca** (`/narudzbe-kupaca`) — prodaje za koje roba nije u salonu („čeka robu”). Računa `stats.waitingOrders(orders, products)`: zaliha se dodjeljuje najstarijim otvorenim prodajama.
- **Nabava od dobavljača** (`/nabava`) — naše narudžbe prema dobavljačima. Ne miješati s narudžbama kupaca.
- **Zaliha** = zbir `stock_movements`. Rezervirano = otvorene prodaje. Prihod se priznaje po `issuedAt` (`reports.ts`).
- **Promjene cijena** — `saveProduct` upisuje `price_changes`; oznaka i obavijest 7 dana.
- **Dnevnik** (`audit_log`) — prijave, neuspjele prijave (zaključavanje nakon 5), sve izmjene iz `MAP`.
- **Prva prijava** — korisnik dobije jednokratni aktivacijski kod (vidi ga admin u Korisnicima) i sam postavi lozinku. Sesija ističe nakon 10 min neaktivnosti i pri zatvaranju preglednika.

## Zamke (već su nas ugrizle)

- **Nema `url()` u CSS datotekama** — razbija CSS hash između SSR-a i klijenta. Slike preko inline stilova.
- **Ne šalji `Date` kao parametar u sirovi `sql\`\`` predložak** (pomak vremenske zone). Koristi `d.toISOString()` + `::timestamp` ili epoch.
- **Vremena upisuj iz JS-a** (`new Date()`), ne oslanjaj se na `defaultNow()` za logiku isteka.
- **Brojeve formatiraj ručno** (`format.ts`), ne `Intl` — SSR i preglednik moraju dati isti tekst.
- Modali idu kroz portal (`Modal.tsx`); CSS za ispis naljepnica je ograničen na `.label .qr svg`.
- `routeTree.gen.ts` generira build/dev — ne uređuj ga ručno.
- Na **svježoj** bazi korisnici `trgovacN` se ne naprave (seed zaposlenika dođe tek nakon prve prijave) — trgovce dodaj u Korisnici i pristup.
- Lokalni Postgres u drugoj zoni (npr. Europe/Zagreb) skriva greške s vremenom — testiraj i rubne slučajeve oko ponoći.

## Objava (deploy)

Detaljno u skillu `objava`. Ukratko:

1. `pnpm typecheck && pnpm test && pnpm build:node` — sve mora proći.
2. Commit s opisnom porukom, zatim **pitaj Vladimira prije `git push origin main`** (osim ako je izričito rekao „objavi”). Nikad `--force`. Push pokreće Render: `pnpm install --frozen-lockfile` → `build:node` → `npm run start` (migracije pa server).
3. Nakon ~3–5 min provjeri https://ardor-4mdu.onrender.com (prvo učitavanje na free planu može trajati do 1 min). Ako deploy padne, pogledaj log u Render Dashboardu (servis `ardor`).
4. Ako se mijenja `package.json`, obavezno osvježi i `pnpm-lock.yaml` (`--frozen-lockfile` na Renderu).

## Sigurnost

- Repo je bio **javan** — ne commitaj `.env`, lozinke, ključeve, stvarne podatke kupaca ni dokumente iz `../ardor-handoff/`.
- Nikad ne upisuj prave lozinke u kod, testove ni skripte. Testne račune i lozinke koristi **samo na lokalnoj bazi**, preko varijabli okruženja.
- Produkcijsku bazu (Render) ne koristi za razvoj ni testove.

## Kako radimo

- Kad Vladimir kaže „kreni redom”: radi stavku po stavku iz plana, nakon svake testiraj (typecheck, test, build, klik kroz aplikaciju), pa nastavi.
- Na kraju svakog posla: 2–4 rečenice što je novo za zaposlenike i kako to provjeriti u aplikaciji.
- Novu funkciju uvijek prati tema u `help.ts`, a po potrebi i ažuriran priručnik u `../ardor-handoff/` (PDF-ovi u ARDOR vizualu, generator u `../ardor-handoff/alati/prirucnik-generator`).
- Vizualni identitet: narandžasta `#F15A29`, žuta `#F79328`, siva `#58595B`, font Ubuntu (bez kurziva), logo u `src/lib/brand.ts` i `components/Logo.tsx`.
