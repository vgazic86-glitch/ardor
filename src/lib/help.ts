/**
 * Upute za korištenje — kratki okvir uz svaki prozor i detaljne upute po cjelinama.
 * Isti sadržaj koristi i AI asistent.
 */

export interface HelpSection {
  h: string
  items: string[]
}

export interface HelpTopic {
  id: string
  title: string
  /** Jedna rečenica: čemu služi. */
  purpose: string
  /** Kratko: šta se unosi (prikazuje se u okviru desno). */
  fields: string[]
  /** Detaljne upute (otvaraju se na "Detaljnije"). */
  details: HelpSection[]
  /** Ruta stranice kojoj tema pripada (za pomoć na stranici). */
  route?: string
}

export const HELP: HelpTopic[] = [
  {
    id: 'pregled',
    route: '/',
    title: 'Pregled',
    purpose: 'Početna stranica: današnji brifing, vaši zadaci, plan prometa i upozorenja.',
    fields: ['Ništa se ne unosi — klik na karticu vodi na detalje.', 'Zvonce gore desno pokazuje obavijesti.'],
    details: [
      {
        h: 'Šta vidite',
        items: [
          'Brifing: dostave danas, otvorene narudžbe, artikli ispod minimuma.',
          'Moji zadaci: zadaci koje su vam dodijelili — kvačicom ih zatvarate.',
          'Plan prometa: koliko je ostvareno od mjesečnog plana (vaš ili salona).',
        ],
      },
      {
        h: 'Prečice',
        items: ['Ctrl+K (ili ⌘K) otvara brzu pretragu i komande.', 'Klik na logo uvijek vraća na Pregled.'],
      },
    ],
  },
  {
    id: 'narudzba',
    route: '/narudzbe',
    title: 'Narudžbe kupaca',
    purpose: 'Unos i praćenje narudžbi kupaca od ponude do isporuke.',
    fields: [
      'Kupac: ime, telefon, adresa dostave.',
      'Artikli: izbor iz kataloga, količina, cijena i popust.',
      'Plaćanje: avans, način plaćanja, ostatak.',
      'Termin dostave ili preuzimanja.',
    ],
    details: [
      {
        h: 'Nova narudžba',
        items: [
          'Gumb "Nova narudžba" ili Ctrl+K → "Nova narudžba".',
          'Upišite kupca — ako već postoji, ponudiće se iz liste kupaca.',
          'Dodajte artikle; rezervacija na zalihi se pravi automatski.',
          'Unesite avans ako je kupac platio dio; ostatak se računa sam.',
        ],
      },
      {
        h: 'Statusi',
        items: [
          'Ponuda → Potvrđena → Spremna → Isporučena. Otkazana oslobađa rezervaciju.',
          'Iz narudžbe se štampa ponuda, predračun i otpremnica (PDF).',
        ],
      },
      {
        h: 'Savjet',
        items: ['Ako artikla nema dovoljno, sistem upozorava — možete odmah napraviti narudžbu dobavljaču.'],
      },
    ],
  },
  {
    id: 'kupci',
    route: '/kupci',
    title: 'Kupci',
    purpose: 'Kartoteka kupaca s historijom kupovine.',
    fields: ['Ime, telefon, e-pošta, adresa, napomena.'],
    details: [
      {
        h: 'Kako radi',
        items: [
          'Kupci se dodaju sami kad unesete narudžbu.',
          'Klik na kupca pokazuje sve njegove narudžbe i ukupan promet.',
          'Pretraga po imenu ili telefonu.',
        ],
      },
    ],
  },
  {
    id: 'reklamacija',
    route: '/reklamacije',
    title: 'Reklamacije',
    purpose: 'Prijava i praćenje reklamacija kupaca do rješenja.',
    fields: ['Kupac i narudžba (artikal se bira iz narudžbe).', 'Vrsta problema i opis kako ga kupac opisuje.', 'Rok za rješenje i ko je zadužen.', 'Fotografije oštećenja (mobitelom).'],
    details: [
      {
        h: 'Tok',
        items: [
          'Prijavljena → U obradi → Kod dobavljača → Riješena ili Odbijena.',
          'Reklamaciju iz narudžbe otvarate gumbom „Reklamacija” u detaljima narudžbe.',
          'Dobavljač se popuni sam prema artiklu.',
          'Zapisnik (PDF) odštampajte i dajte kupcu da potpiše pri prijavi.',
          'Zatvara je voditelj salona ili uprava, uz odabrano rješenje (popravak, zamjena, povrat novca, popust).',
        ],
      },
      {
        h: 'Rok',
        items: ['Predloženi rok je 15 dana od prijave.', 'Reklamacije kojima je prošao rok su crvene i na vrhu liste.'],
      },
    ],
  },
  {
    id: 'dostave',
    route: '/dostave',
    title: 'Dostave',
    purpose: 'Raspored dostava po danima i štampa planova za skladište i dostavljače.',
    fields: ['Datum i vrijeme dostave, dostavljač, napomena.'],
    details: [
      {
        h: 'Plan dostava',
        items: [
          'Dostave dolaze iz narudžbi koje imaju termin.',
          'Za sutrašnji dan štampajte: obrazac za voditelja skladišta, list za dostavljače i potvrde koje kupac potpisuje.',
          'Nakon dostave označite narudžbu kao isporučenu.',
        ],
      },
    ],
  },
  {
    id: 'pazar',
    route: '/pazar',
    title: 'Dnevni pazar',
    purpose: 'Zaključak dana: gotovina, kartice, virmani i predaja novca.',
    fields: ['Gotovina u kasi, kartice, virmanske uplate.', 'Predano / ostavljeno u kasi.', 'Napomena o razlikama.'],
    details: [
      {
        h: 'Zaključak dana',
        items: [
          'Sistem predlaže iznose iz današnjih uplata; upišite stvarno stanje.',
          'Razlika se vidi odmah — upišite razlog u napomenu.',
          'Štampa zaključka (PDF) potpisuje se pri predaji novca.',
          'Uz zaključak štampajte i plan dostava za naredni dan.',
        ],
      },
    ],
  },
  {
    id: 'zalihe',
    route: '/zalihe',
    title: 'Zalihe',
    purpose: 'Stanje robe: na skladištu, rezervisano i slobodno.',
    fields: ['Ništa se ne unosi direktno — zaliha se mijenja primkom, narudžbom i inventurom.'],
    details: [
      {
        h: 'Kolone',
        items: [
          'Stanje: fizički na skladištu.',
          'Rezervisano: obećano kupcima u otvorenim narudžbama.',
          'Slobodno: stanje minus rezervisano — to se smije prodati.',
          'Crveno: ispod minimalne zalihe — vrijeme za narudžbu.',
        ],
      },
    ],
  },
  {
    id: 'nabava',
    route: '/nabava',
    title: 'Narudžbe dobavljačima',
    purpose: 'Naručivanje robe od dobavljača s memorandumom za slanje.',
    fields: ['Dobavljač.', 'Artikli i količine (nabavne cijene).', 'Očekivani rok isporuke, napomena.'],
    details: [
      {
        h: 'Tok',
        items: [
          'Spremljena narudžba je nacrt — možete je mijenjati.',
          'Zaključite je i preuzmite PDF na memorandumu za slanje dobavljaču.',
          'Kad roba stigne, napravite prijem robe (primku) iz narudžbe.',
        ],
      },
    ],
  },
  {
    id: 'primka',
    route: '/primke',
    title: 'Prijem robe',
    purpose: 'Roba koja je stigla od dobavljača ulazi na zalihu.',
    fields: [
      'Dobavljač i broj njegovog računa/otpremnice.',
      'Artikli, primljene količine, nabavna cijena.',
      'Ulazni PDV (za knjigu ulaznih računa).',
    ],
    details: [
      {
        h: 'Kako',
        items: [
          'Po spremanju količine odmah ulaze na zalihu.',
          'Nabavna cijena artikla se ažurira na zadnju.',
          'Primka se automatski knjiži na karticu dobavljača kao dug.',
          'Iznos PDV-a ide u knjigu ulaznih računa (KUF) — kontrola za knjigovođu.',
        ],
      },
    ],
  },
  {
    id: 'artikal',
    route: '/artikli',
    title: 'Artikli',
    purpose: 'Katalog proizvoda: šifra, cijene, dobavljač, minimalna zaliha.',
    fields: [
      'Naziv, šifra, kategorija, opis i dimenzije.',
      'Prodajna cijena (s PDV-om) i nabavna cijena.',
      'Dobavljač, minimalna zaliha, slika.',
    ],
    details: [
      {
        h: 'Savjeti',
        items: [
          'Minimalna zaliha pokreće upozorenje na Pregledu i Zalihama.',
          'QR naljepnice za artikle štampate na stranici Naljepnice.',
          'Nabavnu cijenu vide samo korisnici s pristupom troškovima.',
        ],
      },
    ],
  },
  {
    id: 'inventura',
    route: '/inventura',
    title: 'Inventura',
    purpose: 'Popis stanja i usklađivanje zalihe sa stvarnim stanjem.',
    fields: ['Prebrojana količina po artiklu.'],
    details: [
      {
        h: 'Kako',
        items: [
          'Upišite koliko ste prebrojali; razlika se prikazuje odmah.',
          'Potvrdom se zaliha usklađuje, a razlika ostaje zapisana.',
        ],
      },
    ],
  },
  {
    id: 'trosak',
    route: '/troskovi',
    title: 'Troškovi i zarada',
    purpose: 'Unos troškova i pregled zarade po mjesecima.',
    fields: ['Datum, kategorija, opis.', 'Iznos bez PDV-a i PDV posebno.', 'Ponavljajući trošak (mjesečno).'],
    details: [
      {
        h: 'Kako',
        items: [
          'Iznos se unosi bez PDV-a; PDV ulazi u obračun ulaznog PDV-a.',
          'Zarada = prodaja − nabavna vrijednost prodane robe − troškovi.',
          'Dostupno samo upravi i administratorima.',
        ],
      },
    ],
  },
  {
    id: 'kuf',
    route: '/kuf',
    title: 'Ulazni računi (PDV)',
    purpose: 'Knjiga ulaznih računa — kontrola ulaznog PDV-a za knjigovođu.',
    fields: ['Na primci ili trošku: osnovica i PDV 17 %.'],
    details: [
      {
        h: 'Kako',
        items: [
          'Podaci dolaze iz primki i troškova — ovdje se samo pregledaju i izvoze.',
          'Izvoz u Excel za knjigovođu po mjesecu.',
          'Ovo je kontrolna evidencija; službeni obračun radi knjigovođa.',
        ],
      },
    ],
  },
  {
    id: 'izvjestaji',
    route: '/izvjestaji',
    title: 'Izvještaji',
    purpose: 'Promet, prodaja po zaposlenicima i artiklima, trendovi.',
    fields: ['Izbor perioda i filtera.'],
    details: [{ h: 'Savjet', items: ['Svaki izvještaj se može izvesti u Excel.'] }],
  },
  {
    id: 'kartica',
    route: '/dobavljaci',
    title: 'Dobavljači i kartice',
    purpose: 'Podaci o dobavljačima i kartica duga (primke, plaćanja, povrati).',
    fields: ['Dobavljač: naziv, JIB/PDV broj, kontakt, račun.', 'Stavka kartice: datum, vrsta, iznos, broj dokumenta.'],
    details: [
      {
        h: 'Kartica',
        items: [
          'Primke se knjiže same kao dug.',
          'Plaćanja knjižite iz izvoda: vrsta "Plaćanje", iznos i broj izvoda.',
          'Saldo pokazuje koliko dugujete dobavljaču.',
        ],
      },
    ],
  },
  {
    id: 'zaposlenik',
    route: '/zaposlenici',
    title: 'Zaposlenici',
    purpose: 'Popis zaposlenika, kontakti i planovi prometa.',
    fields: ['Ime, uloga, telefon, e-pošta.', 'Mjesečni plan prometa i bonus.'],
    details: [
      {
        h: 'Plan prometa',
        items: [
          'Svaki mjesec može imati drugačiji plan ("Plan prometa po mjesecima").',
          'Prazno polje znači da vrijedi osnovni cilj zaposlenika.',
        ],
      },
    ],
  },
  {
    id: 'radno',
    route: '/radno-vrijeme',
    title: 'Radno vrijeme',
    purpose: 'Evidencija dolazaka, odlazaka i odsustava.',
    fields: ['Dolazak i odlazak (sat:minute).', 'Odsustvo: godišnji, bolovanje, praznik, slobodan dan — za period.'],
    details: [
      {
        h: 'Kako',
        items: [
          'Klik na dan u tabeli otvara upis za taj dan.',
          'Odsustvo za više dana unosite odjednom (nedjelje se preskaču).',
          'Mjesečni zbir sati i odsustava izvozi se u Excel.',
        ],
      },
    ],
  },
  {
    id: 'kadrovska',
    route: '/kadrovska',
    title: 'Kadrovska',
    purpose: 'Povjerljivi podaci zaposlenika: ugovori, plaće.',
    fields: ['Plaća: datum od kad vrijedi, neto/bruto iznos.'],
    details: [{ h: 'Pristup', items: ['Samo uprava i administratori.', 'Nova plaća se dodaje u historiju, stare ostaju zapisane.'] }],
  },
  {
    id: 'zadatak',
    route: '/zadaci',
    title: 'Zadaci',
    purpose: 'Radni zadaci za trgovce i voditelja salona.',
    fields: ['Naslov, opis.', 'Kome (može više osoba).', 'Rok i prioritet.'],
    details: [
      {
        h: 'Ko kome',
        items: [
          'Voditelj salona daje zadatke trgovcima.',
          'Administratori i uprava daju zadatke trgovcima i voditelju.',
          'Svaka osoba dobija svoj zadatak i zatvara ga za sebe.',
        ],
      },
    ],
  },
  {
    id: 'dokumenti',
    route: '/dokumenti',
    title: 'Dokumenti',
    purpose: 'Interni pravilnici, upute i obrasci.',
    fields: ['Naslov, sadržaj (formatirani tekst).'],
    details: [{ h: 'Savjet', items: ['Dokument se može odštampati ili spremiti kao PDF.'] }],
  },
  {
    id: 'korisnik',
    route: '/korisnici',
    title: 'Korisnici i pristup',
    purpose: 'Korisnički računi, uloge, ko je online i kad je bio zadnji put prijavljen.',
    fields: ['Ime, korisničko ime, uloga.', 'Veza na zaposlenika.', 'Aktivan / neaktivan.'],
    details: [
      {
        h: 'Uloge',
        items: [
          'Administrator i uprava: sve, uključujući troškove, zaradu i kadrovsku.',
          'Voditelj: prodaja, skladište, zadaci za trgovce.',
          'Operativa: primke, izvodi, operativni poslovi — bez tuđeg prometa i zarade.',
          'Trgovac: svoje narudžbe, kupci i zalihe, bez nabavnih cijena.',
        ],
      },
      {
        h: 'Prisutnost i odjava',
        items: [
          'Zelena tačka: korisnik je trenutno online.',
          'Zatvaranjem preglednika ili aplikacije korisnik se odjavljuje; bez aktivnosti 10 min također.',
          'Deaktivacijom ili resetom lozinke korisnik se odmah odjavljuje sa svih uređaja.',
        ],
      },
      {
        h: 'Dnevnik izmjena i zaštita prijave',
        items: [
          'Kartica "Dnevnik izmjena" pokazuje ko je i kada šta unio, promijenio ili obrisao, te sve prijave.',
          'Nakon 5 pogrešnih lozinki račun se zaključava na 15 minuta; administrator ga može odmah otključati.',
          'Zaključan račun i učestale neuspjele prijave javljaju se administratoru u zvoncu.',
        ],
      },
    ],
  },
]

const BY_ID = Object.fromEntries(HELP.map((t) => [t.id, t]))

export function helpById(id: string | undefined) {
  return id ? BY_ID[id] : undefined
}

/** Pomoć za stranicu prema ruti. */
export function helpForPath(path: string) {
  const first = '/' + (path.split('/')[1] ?? '')
  return HELP.find((t) => t.route === first)
}

/** Pogađa temu pomoći prema naslovu prozora. */
export function helpForTitle(title: string): HelpTopic | undefined {
  const t = title.toLowerCase()
  const rules: [RegExp, string][] = [
    [/narudžb[au] dobavlja|nb-/, 'nabava'],
    [/nova narudžba/, 'narudzba'],
    [/prijem robe|primk/, 'primka'],
    [/artikal/, 'artikal'],
    [/zaposlenik/, 'zaposlenik'],
    [/plan prometa/, 'zaposlenik'],
    [/zadatak/, 'zadatak'],
    [/trošak/, 'trosak'],
    [/korisnik/, 'korisnik'],
    [/plaća/, 'kadrovska'],
    [/odsustvo|·/, 'radno'],
    [/stavk[ae] kartice|dobavljač/, 'kartica'],
    [/dokument/, 'dokumenti'],
  ]
  for (const [re, id] of rules) if (re.test(t)) return BY_ID[id]
  return undefined
}

/** Sav sadržaj kao tekst (za AI asistenta i pretragu). */
export function helpAsText() {
  return HELP.map(
    (t) =>
      `## ${t.title}${t.route ? ` (${t.route})` : ''}\n${t.purpose}\nUnos: ${t.fields.join(' ')}\n` +
      t.details.map((s) => `${s.h}: ${s.items.join(' ')}`).join('\n'),
  ).join('\n\n')
}
