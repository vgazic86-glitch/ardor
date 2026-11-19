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
    id: 'obavijesti',
    route: '/',
    title: 'Obavijesti i oglasna ploča',
    purpose: 'Objave uprave i voditelja salona te obavijesti o događajima u salonu.',
    fields: ['Oglasna ploča: naslov i tekst objave (samo uprava, admin i voditelj salona).'],
    details: [
      {
        h: 'Šta vidite',
        items: [
          'Oglasna ploča na Pregledu: objave. Kliknite „Pročitao/la sam” kad pročitate, da uprava vidi tko je pročitao.',
          'Zvono gore desno: nove objave i, za voditelja salona, svaki događaj iz salona (prodaja, dostava, uplata, primka, zadatak, kupac, reklamacija, dolazak na posao…).',
          'Plaće, bonusi, troškovi i prijave u aplikaciji se ne javljaju u obavijestima.',
        ],
      },
      {
        h: 'Savjet',
        items: ['Kad otvorite zvono, obavijesti se označavaju kao pročitane. Brojka na zvonu pokazuje nepročitane.'],
      },
    ],
  },
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
        items: ['Ctrl+K (ili ⌘K) otvara brzu pretragu i komande.', 'Klik na logo uvijek vraća na Pregled.', 'Tamni način: dolje lijevo klik na svoje ime → „Tamni način” (pamti se na tom uređaju; isto mjesto vraća svijetli).', 'Na mobitelu je sat u gornjoj traci; na većem ekranu uz sat su datum i prognoza (klik za 7 dana).'],
      },
    ],
  },
  {
    id: 'narudzba',
    route: '/narudzbe',
    title: 'Prodaja',
    purpose: 'Sve ponude i prodaje kupcima, od ponude do isporuke i naplate.',
    fields: [
      'Kupac: ime, telefon, adresa dostave.',
      'Artikli: izbor iz kataloga, količina, varijanta, popust.',
      'Plaćanje: avans, način plaćanja, ostatak.',
      'Termin dostave ili preuzimanja.',
    ],
    details: [
      {
        h: 'Tri pojma koja se ne miješaju',
        items: [
          'Prodaja: sve što je kupac kupio ili mu je ponuđeno. Unosi se gumbom „Nova prodaja”.',
          'Narudžba kupca: prodaja za koju robe nema u salonu. Vodi se na posebnoj stranici dok roba ne stigne.',
          'Nabava od dobavljača: ono što salon naručuje od dobavljača. To je posao skladišta i uprave.',
        ],
      },
      {
        h: 'Nova prodaja',
        items: [
          'Gumb „Nova prodaja” ili Ctrl+K → „Nova prodaja”.',
          'Upišite kupca i dodajte artikle; ako robe nema dovoljno, aplikacija to odmah napiše ispod stavke.',
          'Roba koja je u salonu rezerviše se za kupca automatski.',
          'Unesite avans ako je kupac platio dio; ostatak se računa sam.',
        ],
      },
      {
        h: 'Statusi',
        items: [
          'Ponuda → Potvrđena → Spremna → Isporučena. Otkazana oslobađa rezervaciju.',
          'Dok prodaja čeka robu (vidi Narudžbe kupaca), ne može se označiti kao „Spremna” ni „Isporučena”, niti dostava kao „U putu” ili „Dostavljeno”. Gumb je zasivljen i piše koji artikli fale. To vrijedi za sve uloge.',
          '„Kupac odmah preuzima” radi samo za robu koja je slobodna u salonu.',
          'Iz prodaje se izrađuju ponuda, predračun, otpremnica i račun (PDF). Račun je za predujam kad je kupac platio dio iznosa, a konačni kad je platio cijeli iznos. Dokument PDF otvorite i odštampajte iz preglednika.',
        ],
      },
    ],
  },
  {
    id: 'narudzbe-kupaca',
    route: '/narudzbe-kupaca',
    title: 'Narudžbe kupaca',
    purpose: 'Prodaje za koje robe nema u salonu, dok roba ne stigne.',
    fields: ['Ništa se ne unosi — lista se puni sama iz prodaje i prazni kad se upiše primka.'],
    details: [
      {
        h: 'Kako radi',
        items: [
          'Kad prodate artikal kojeg nema dovoljno u salonu, prodaja se pojavi ovdje s onim što nedostaje.',
          'Roba u salonu dodjeljuje se najstarijim prodajama; ko ostane bez pokrića, čeka robu.',
          'Uz svaki artikal piše je li već naručen kod dobavljača (vide operativa, voditelj i uprava).',
          'Kad roba stigne i primka se upiše, narudžba sama nestaje s liste i spremna je za isporuku.',
          'Dok je narudžba na ovoj listi, status „Spremna” i „Isporučena” nije moguć — tek kad roba stigne.',
          'Ovo nisu narudžbe dobavljačima: one su pod Roba → Nabava od dobavljača.',
        ],
      },
    ],
  },
  {
    id: 'asistent',
    title: 'AI asistent',
    purpose: 'Pitanja o radu u aplikaciji, savjeti za kupce, zalihe i kontakti; upravi i odgovori o poslovanju.',
    fields: ['Gumb „Asistent” dolje desno; pitanje se piše običnim riječima.'],
    details: [
      {
        h: 'Za sve',
        items: [
          'Kako se nešto radi u aplikaciji, šta ponuditi kupcu, ima li artikla na stanju, broj telefona kolege.',
          'Asistent ne mijenja ništa u aplikaciji — kaže vam gdje to sami uradite.',
          'Pomaže i sa širim pitanjima za posao i kupce: „napiši ljubaznu poruku kupcu da kasni dostava”, „prevedi na engleski”, „razlika masiv i iverica”, „kako održavati kožnu garnituru”, „ideja za objavu na Instagramu”.',
          'Privatna i nevezana pitanja (recepti, zadaće, politika…) ljubazno odbija. Besplatni AI ima oko 500 pitanja dnevno za cijeli salon.',
          'Razgovor vidi samo onaj ko je prijavljen; briše se pri odjavi i zatvaranju preglednika.',
          'Asistent koristi Google Gemini. Imena kupaca i kolega šalju se šifrirano, a telefoni i e-pošta se ne šalju — pitanja o kontaktima odgovara aplikacija sama.',
          'U pitanje ne upisujte osobne podatke kupaca (puno ime, telefon, JMBG, adresu): ono što upišete ide Googleu.',
        ],
      },
      {
        h: 'Za upravu i administratora',
        items: [
          'Asistent zna i sažetak poslovanja: promet po mjesecima i plan, realizaciju i maržu, maržu po kategorijama, prodavače, najprodavanije artikle, zalihe (ispod minimuma, bez prodaje 90 dana), narudžbe kupaca i naplatu (ko kasni i koliko).',
          'Primjeri: „Kakav je promet u odnosu na plan?”, „Ko najviše kasni s plaćanjem?”, „Koja kategorija ima najmanju maržu?”, „Šta nam stoji na zalihi bez prodaje?”.',
          'Plaće, ugovori i troškovi nisu u sažetku — to se gleda u Kadrovskoj i u Troškovi i zarada.',
          'Trgovac i ostale uloge ne dobijaju ove podatke.',
          'Bez AI ključa asistent na poslovna pitanja prikaže gotov sažetak brojki.',
        ],
      },
    ],
  },
  {
    id: 'naplata',
    route: '/naplata',
    title: 'Naplata',
    purpose: 'Ko duguje, od kada kasni, rate i podsjetnici kupcima.',
    fields: ['Rok plaćanja i plan rata upisuju se u prozoru prodaje (dio „Naplata”).'],
    details: [
      {
        h: 'Rokovi',
        items: [
          'Ostatak za uplatu dospijeva na dan isporuke (kad roba izađe iz salona).',
          'Ako je s kupcem dogovoren drugi rok, u prozoru prodaje kliknite „Promijeni” kod „Rok plaćanja ostatka”.',
          'Kašnjenje se broji od roka. „Dospijeva danas” znači da je rok danas; od sutra prodaja kasni.',
          'Uplate pokrivaju obaveze redom: prvo avans, pa rate od najstarije.',
        ],
      },
      {
        h: 'Rate (salon kreditira kupca)',
        items: [
          'U novoj prodaji odaberite način plaćanja „Rate”, upišite broj rata i datum prve rate.',
          'Ostatak nakon avansa dijeli se na jednake mjesečne iznose.',
          'Plan se vidi u prozoru prodaje: koja je rata plaćena, djelimično plaćena ili kasni. „Novi plan” pravi plan za ono što je ostalo.',
          'Svaku uplatu rate evidentirajte u prozoru prodaje (Uplata), kao i do sada.',
        ],
      },
      {
        h: 'Podsjetnik kupcu',
        items: [
          '„Podsjeti” otvara gotov tekst s iznosom, rokom i sljedećom ratom. Tekst se može prepraviti.',
          'WhatsApp, Viber, SMS, „Nazovi” ili „Kopiraj” — svaki klik bilježi da je kupac podsjećen, pa se u listi vidi datum i način zadnjeg podsjetnika.',
          'Trgovac vidi i podsjeća samo svoje kupce; voditelj salona i uprava vide sve.',
        ],
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
    id: 'katalog',
    route: '/katalog',
    title: 'Katalog za kupca',
    purpose: 'Prikaz artikala na tabletu za kupca: slike, cijene i dostupnost, bez internih podataka.',
    fields: ['Kupac bira kategoriju, traži i dodaje artikle u „Moj izbor”.', 'Prodavač iz izbora jednim klikom pravi ponudu.'],
    details: [
      {
        h: 'Kako',
        items: [
          'Otvorite „Katalog za kupca” i dajte tablet kupcu — meni i interni podaci su skriveni.',
          'Dostupnost: „Odmah dostupno” ili „Po narudžbi” s okvirnim rokom dobavljača; količine na zalihi se ne prikazuju.',
          '„Napravi ponudu” otvara novu narudžbu sa svim odabranim artiklima, sa statusom Ponuda.',
          'Strelica gore lijevo vraća na aplikaciju.',
        ],
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
          'Promjena cijene: artikal sedam dana nosi oznaku „nova cijena”, svi dobiju obavijest u zvoncu, a gumb „Promjene cijena” pokazuje staru i novu cijenu, datum i ko je mijenjao. Nakon promjene zamijenite oznaku u salonu.',
        ],
      },
    ],
  },
  {
    id: 'nabava',
    route: '/nabava',
    title: 'Nabava od dobavljača',
    purpose: 'Ono što salon naručuje od dobavljača (nije isto što i narudžbe kupaca).',
    fields: ['Dobavljač.', 'Artikli i količine (nabavne cijene).', 'Očekivani rok isporuke, napomena.'],
    details: [
      {
        h: 'Tok',
        items: [
          '„Prijedlog narudžbe” sam izračuna šta treba naručiti po dobavljaču (rezervacije kupaca + minimum + prodaja tokom roka isporuke − stanje − već naručeno) i jednim klikom pravi nacrte.',
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
          'Pogrešnu primku možete ispraviti: otvorite je u listi i kliknite „Izmijeni primku”. Zaliha se preračuna, a broj primke ostaje isti. Izmjena nije moguća ako bi zaliha pala ispod nule.',
        ],
      },
      {
        h: 'Dokument dobavljača (PDF ili slika)',
        items: [
          'Kliknite „Učitaj dokument dobavljača”. Sistem pročita račun ili otpremnicu i popuni dobavljača, broj dokumenta, datum i stavke.',
          'Ništa se ne sprema samo od sebe: provjerite količine i cijene, pa kliknite „Knjiži prijem”.',
          'Stavke koje nisu u katalogu ne ulaze u primku. Prvo ih dodajte kao artikle, pa ponovo učitajte dokument.',
          'Dokument se sprema uz primku u bazi. Pregled dokumenta iz popisa primki još nije uključen.',
          'Čitanje dokumenta šalje samo dokument dobavljača vanjskom AI servisu, bez podataka o kupcima.',
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
          'Varijante (štof, boja, noge, orijentacija) upisujete u polje „Varijante”, jedna grupa po redu, npr. „Štof: siva, bež”. Kupac ih bira pri narudžbi, a ispisuju se na ponudi, otpremnici i nalogu za dostavu.',
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
    details: [
      { h: 'Savjet', items: ['Svaki izvještaj se može izvesti u Excel.'] },
      {
        h: 'Sedmični izvještaj e-poštom',
        items: [
          'Svakog ponedjeljka u 7:00 upravi stiže e-pošta s pregledom prošle sedmice (ponedjeljak–nedjelja).',
          'U poruci su: prodaja sedmice i poređenje s prethodnom, isporučeno i naplaćeno, plan mjeseca, prodaja po prodavaču, najprodavaniji artikli, narudžbe kupaca koje čekaju robu, najveći dužnici i reklamacije s probijenim rokom.',
          'Primaoci su korisnici s ulogom administrator ili uprava koji imaju upisanu e-poštu (Korisnici i pristup). Za novog primaoca samo upišite e-poštu.',
          'Na dnu stranice Izvještaji: „Pregled poruke” pokazuje kako izvještaj izgleda, a „Pošalji probni primjerak” ga odmah šalje primaocima.',
          'Ako piše „Nije podešeno”, nedostaje ključ za e-poštu ili za automatsko slanje — to podešava administrator.',
        ],
      },
    ],
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
    details: [
      { h: 'Savjet', items: ['Dokument se može odštampati ili spremiti kao PDF.'] },
      {
        h: 'Priručnici po ulogama',
        items: [
          'Svaki zaposlenik vidi priručnik svoje uloge: trgovac (i uređenje salona), voditelj salona (i uređenje salona), operativa i skladište, dostava i montaža.',
          'Administrator i uprava vide sve, uključujući priručnik vlasnika i voditelja marketinga.',
          'Administrator i uprava učitavaju ili mijenjaju PDF na vrhu stranice Dokumenti → „Priručnici po ulogama” → Učitaj PDF / Zamijeni PDF.',
        ],
      },
    ],
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
          'Dostava i montaža: samo dostave (status s terena), radno vrijeme, zadaci i svoj priručnik. Obavezno povezati sa zaposlenikom.',
        ],
      },
      {
        h: 'Brisanje primjernih podataka (jednom, prije stvarnog rada)',
        items: [
          'Kartica „Podaci o firmi” → dolje „Brisanje primjernih podataka”. Vidi samo administrator.',
          'Prvo napravite kopiju: Izvještaji → Kopija svih podataka (Excel) i kopiju baze.',
          'Briše prodaje, kupce, uplate, rate, dostave, primke, reklamacije, narudžbe dobavljačima, zadatke, radno vrijeme i primjerne troškove i plaće.',
          'Ostaju artikli, dobavljači, zaposlenici, korisnici, planovi i dokumenti. Zaliha svih artikala postaje 0 — zatim uradite inventuru.',
          'Potvrda je dvostruka: kvačica za kopiju i upisano OBRIŠI, pa još „Da, obriši”. U dnevniku izmjena ostaje ko je i kada obrisao.',
        ],
      },
      {
        h: 'Prisutnost i odjava',
        items: [
          'Zelena tačka: korisnik je trenutno online.',
          'Zatvaranjem prozora aplikacije korisnik se odjavljuje (ako je otvoreno više kartica — kad se zatvori zadnja). Osvježavanje stranice ne odjavljuje.', 'Bez aktivnosti 10 min korisnik se također odjavljuje.',
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
