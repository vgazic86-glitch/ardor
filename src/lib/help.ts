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
    id: 'radni-nalozi',
    route: '/radni-nalozi',
    title: 'Namještaj po mjeri i radni nalozi',
    purpose: 'Kuhinje, plakari i ostalo po mjeri: prodaja s cijenom i slikom iz Palette CAD-a, radni nalog za radionicu.',
    fields: [
      'U Novoj prodaji: „Po mjeri” → vrsta, naziv za kupca, opis, cijena s PDV-om (iz Palette CAD-a), slika.',
      'Radni nalog: status (čeka početak, krojenje kod partnera, sklapanje, gotovo), rok izrade, bilješka.',
    ],
    details: [
      {
        h: 'Kod trgovca (prodaja)',
        items: [
          'U Palette CAD-u napravite projekt i kalkulaciju. Spremite sliku prikaza (JPG ili PNG).',
          'U aplikaciji: Nova prodaja → „Po mjeri (kuhinja, plakar…)”. Izaberite vrstu, upišite naziv za kupca (npr. „Kuhinja po mjeri — bijeli mat, hrast”), kratki opis, ukupnu cijenu s PDV-om iz Palette CAD-a i dodajte sliku.',
          'Za ponudu kupcu stavite status „Ponuda” i u prozoru prodaje kliknite PDF ponude: kupac vidi sliku, opis i ukupnu cijenu, bez detalja kalkulacije.',
          'Kad kupac potvrdi, prodaju stavite na „Potvrđena” — radionica tada sama dobije radni nalog (RN-2026-0001 …). Uplate, rate i dostava rade kao kod svake prodaje.',
          'Stavka po mjeri ne skida ništa sa zalihe i ne vodi se pod „Narudžbe kupaca” (ne čeka robu nego radionicu).',
          'Status „Spremna” i isporuka mogući su tek kad je radni nalog „Gotovo”. Prodavač dobije obavijest u zvoncu kad radionica završi.',
        ],
      },
      {
        h: 'U radionici (radni nalozi)',
        items: [
          'Stranica Radni nalozi pokazuje sliku, opis, kupca, prodaju i datum dostave. Otvoreni nalozi su poredani po roku.',
          'Kad iverica ode na krojenje kod partnera, kliknite „Krojenje kod partnera”; kad krene sklapanje, „Sklapanje u radionici”. Prodaja se tada sama prebaci u „U izradi”.',
          'Kad je komad gotov, kliknite „Gotovo”. Upišite rok izrade i bilješku (npr. kad stiže iverica) — trgovac to vidi i može obavijestiti kupca.',
          'Trgovac vidi naloge svojih prodaja, ali status mijenja radionica (i voditelj, operativa, uprava, dostava i montaža).',
        ],
      },
      {
        h: 'Troškovi i zarada po komadu',
        items: [
          'Na nalogu kliknite „Troškovi” i upišite troškove bez PDV-a: krojenje kod partnera (partner, broj računa, iznos), materijal i okovi, sati rada (satnica se predloži sama) i ostalo (prijevoz, usluge).',
          'Troškove vide i upisuju operativa, voditelj i uprava. Trgovac i dostava ih ne vide.',
          'Zaradu po komadu (prodajna cijena bez PDV-a minus svi troškovi, i postotak) vide samo admin i uprava. Uprava na vrhu stranice mijenja satnicu radionice i vidi zbir zarade na gotovim nalozima.',
          'Vanjski troškovi (partner, materijal, ostalo) automatski ulaze u nabavnu vrijednost prodaje u Troškovima i zaradi i u Izvještajima, kad roba izađe kupcu.',
          'Sati vlastitih radnika ulaze samo u zaradu po komadu — u mjesečnoj zaradi su već kroz plaće, pa se ne računaju dvaput.',
          'Račun partnera za krojenje i dalje se knjiži kao i do sada (ulazni računi, kartica dobavljača); ovdje se upisuje samo da se zna koliko je koštao ovaj komad.',
        ],
      },
    ],
  },
  {
    id: 'radionica',
    route: '/radionica',
    title: 'Radionički materijal',
    purpose: 'Zaliha repromaterijala radionice (ploče, ABS traka, okovi…) u m, m², kg ili komadima.',
    fields: [
      'Materijal: naziv, jedinica mjere, kategorija, dobavljač, nabavna cijena, minimalna zaliha.',
      'Prijem: datum, dobavljač, broj računa, stavke (količina i cijena bez PDV-a).',
      'Inventura: izbrojano stvarno stanje.',
    ],
    details: [
      {
        h: 'Kako radi',
        items: [
          'Repromaterijal je odvojen od prodajnog kataloga — ne vidi se u Artiklima, Zalihama ni na webu. Šifra se dodijeli sama (MAT-0001 …).',
          'Količine mogu imati decimale: 4,25 m², 12,5 m ABS trake. Upisujte ih sa zarezom.',
          '„Prijem materijala” je jedini korak: u stavci upišite naziv. Postojeći materijal se nudi dok tipkate; ako ga nema, izaberite jedinicu i kategoriju — novi materijal se sam doda u šifarnik pri spremanju prijema.',
          'Prijem povećava zalihu i postavlja zadnju nabavnu cijenu. Prosječna nabavna cijena računa se iz svih prijema.',
          '„Novi materijal” (bez prijema) služi samo kad želite materijal unaprijed upisati, npr. s minimalnom zalihom. Minimum i ostale podatke možete urediti i kasnije (olovka u popisu).',
          'Utrošak: na Radnim nalozima → Troškovi → „Materijal i okovi” → „Iz zalihe radionice” izaberite materijal i upišite količinu. Trošak se obračuna po prosječnoj nabavnoj cijeni, a materijal se skine sa zalihe. Brisanje tog troška vraća materijal na zalihu.',
          'Materijal kupljen baš za jedan nalog (bez zalihe) upisuje se ručno: „ručni unos”, količina i cijena.',
          'Inventura: upišite izbrojano stanje — aplikacija upiše korekciju za razliku (vidi se pod Kretanja).',
          'Materijal ispod minimalne zalihe označen je na vrhu stranice i u popisu (filter „Ispod minimuma”).',
          'Vide i vode ga operativa, voditelj i uprava. Račun dobavljača za materijal i dalje se knjiži kao i do sada (ulazni računi).',
        ],
      },
    ],
  },
  {
    id: 'pristupni-podaci',
    route: '/pristupni-podaci',
    title: 'Pristupni podaci',
    purpose: 'Trezor službenih pristupnih podataka (mailovi, hosting, banke, društvene mreže, programi) — vidi ga samo administrator.',
    fields: [
      'Vrsta, naziv (npr. info@ardornamjestaj.com), korisničko ime, adresa za prijavu.',
      'Lozinka i bilješka (npr. IMAP/SMTP postavke, PIN, kodovi za oporavak) — šifrirano.',
    ],
    details: [
      {
        h: 'Kako radi',
        items: [
          'Prvi put postavite lozinku trezora (najmanje 10 znakova, drukčija od lozinke za prijavu). Njome se šifriraju sve lozinke i bilješke.',
          'Lozinka trezora se ne sprema nigdje. Ako je zaboravite, podatke nije moguće vratiti — zapišite je i čuvajte na sigurnom.',
          'Trezor se otključava lozinkom trezora i sam se zaključa nakon 15 minuta bez rada, kad napustite stranicu ili gumbom „Zaključaj”.',
          'Lozinka je skrivena dok ne kliknete oko (sama se sakrije nakon 30 sekundi). Gumb za kopiranje stavi lozinku u međuspremnik, pa je zalijepite u prijavu.',
          '„Nova” u prozoru zapisa napravi jaku nasumičnu lozinku od 16 znakova.',
          'U dnevniku izmjena se vidi tko je otvorio trezor, koju lozinku je prikazao i što je spremio ili obrisao — sama lozinka se nikad ne upisuje u dnevnik.',
          'Lozinku trezora mijenjate gumbom „Lozinka trezora”: svi zapisi se ponovo šifriraju.',
          'Vidi samo uloga administrator. Uprava, voditelj i ostali ne vide ni stavku u meniju.',
        ],
      },
    ],
  },
  {
    id: 'izvoz',
    route: '/izvoz',
    title: 'Izvoz',
    purpose: 'Ponude stranim kupcima (EUR, bez PDV-a); prihvaćena ponuda sama postaje račun.',
    fields: [
      'Kupac: naziv firme, zemlja, adresa, PDV/VAT broj, kontakt.',
      'Uslovi: valuta i kurs, paritet (Incoterms), rok plaćanja u danima, isporuka, odakle roba izlazi.',
      'Stavke: artikal iz kataloga ili slobodna stavka; cijena u valuti ponude, bez PDV-a; rabat.',
    ],
    details: [
      {
        h: 'Tok posla',
        items: [
          '„Nova ponuda” → upišite kupca, uslove i stavke → Spremi. Broj se dodijeli sam: IZP-2026-0001, IZP-2026-0002 …',
          '„PDF” daje ponudu na memorandumu, dvojezično (bosanski / engleski), s IBAN-om i SWIFT-om firme. Pošaljite je kupcu i kliknite „Poslana kupcu”.',
          'Kad kupac potvrdi, kliknite „Prihvaćena”. Aplikacija tada sama izda račun (IZR-2026-0001 …, redom, s današnjim datumom), postavi rok plaćanja i skine artikle iz kataloga sa zalihe (skladište ili salon, kako je odabrano na ponudi).',
          'Odbijenu ponudu označite „Odbijena”; može se vratiti u otvorene. Ponuda kojoj je prošao rok važenja dobije oznaku „Istekla”.',
          'Na kartici Računi: „Plaćen” kad uplata stigne; dospjeli neplaćeni računi su crveni.',
        ],
      },
      {
        h: 'Cijene, valuta i PDV',
        items: [
          'Predložena cijena artikla = maloprodajna bez PDV-a preračunata u valutu ponude. Promijenite je po dogovoru (npr. veleprodajna cijena).',
          'EUR ima fiksni kurs 1,95583 KM. Za USD ili CHF upišite srednji kurs CBBiH na dan ponude. Na PDF-u se ispisuje i protuvrijednost u KM.',
          'Izvoz je oslobođen PDV-a: na dokumentu je PDV 0 % i napomena o oslobođenju. Tekst napomene provjerite s knjigovođom (može se promijeniti na svakoj ponudi).',
          'Naziv stavke možete napisati i na engleskom — to piše na PDF-u kupcu.',
          'IBAN i SWIFT firme upisuje admin: Korisnici i pristup → Podaci o firmi.',
        ],
      },
      {
        h: 'Ispravke i storno',
        items: [
          'Prihvaćena ponuda se više ne mijenja. Ako je na računu greška, na kartici Računi kliknite „Storno”: račun ostaje zapisan s oznakom Storniran, roba se vraća na zalihu, a ponuda na „Poslana kupcu”. Ispravite je i ponovo kliknite „Prihvaćena” — dobit će novi broj računa.',
          'Ponuda se može obrisati samo ako po njoj nikad nije izdan račun.',
          'Na Zalihama i kartici artikla izlaz po izvozu vidi se kao „Izvoz (račun)”.',
          'Fiskalni račun i knjiženje i dalje idu kroz knjigovodstveni program — ovaj račun je dokument za kupca i evidencija u aplikaciji.',
        ],
      },
    ],
  },
  {
    id: 'web',
    route: '/web',
    title: 'Web stranica',
    purpose: 'Sve što kupci vide na webu: pregled stranica, upiti, artikli, tekstovi i članci.',
    fields: [
      'Pregled weba: popis svih stranica weba, što je na njima i gumb „Uredi” koji vodi tačno na mjesto gdje se to mijenja.',
      'Upiti: status (Novo, U obradi, Zatvoreno), bilješka, „Dodaj u kupce”.',
      'Artikli na webu: poseban popis samo za web (nije povezan s Artiklima aplikacije) — fotografije, naziv, cijena, stara cijena za akciju, prostorija, dostupnost, opis, „Vidljiv na webu”.',
    ],
    details: [
      {
        h: 'Upiti s weba',
        items: [
          'Svaki obrazac s web stranice (besplatna ponuda, zakazani posjet salonu, zakazano mjerenje) stiže ovdje i u zvonce trgovcima, voditelju i upravi.',
          'Kupca nazovite isti radni dan. Kad preuzmete upit, stavite ga „U obradi” — kolege vide da je neko već zvao.',
          'Termin posjeta ili mjerenja potvrdite kupcu pozivom ili Viberom; upit tek tada zatvorite.',
          '„Dodaj u kupce” pravi kupca u aplikaciji (ili ga poveže s postojećim kupcem istog telefona), da se može napraviti prodaja.',
          'Fotografije prostorije koje je kupac poslao otvaraju se klikom.',
          'Ako je kupac prošao AI savjetnika, vidi se i njegov prijedlog (prostorija, kvadratura, stil, budžet).',
        ],
      },
      {
        h: 'Artikli na webu',
        items: [
          'Artikli na webu su POSEBAN popis samo za web stranicu. Nisu povezani s Artiklima, zalihama ni cijenama u aplikaciji — promjena u Artiklima ne mijenja web, i obrnuto.',
          'Novi artikal: Artikli na webu → „Novi artikal za web”. U prozoru: 1. fotografije (do 6; klik ili povucite; s mobitela je u redu; prva je glavna), 2. naziv, vrsta, cijena u KM s PDV-om, prostorija i dostupnost, 3. opis i mjere. Desno piše na kojim stranicama weba će se vidjeti.',
          'Na web ide samo artikal s barem jednom fotografijom i kvačicom „Vidljiv na webu”. Da ga privremeno sklonite, maknite kvačicu; „Obriši” ga trajno briše zajedno s fotografijama.',
          'Dostupnost birate sami: „Odmah sa zalihe” ili „Po narudžbi”.',
          'Za akciju upišite staru cijenu (veću od cijene) — web je precrta i artikal stavi na stranicu Akcije.',
          '„Istaknut” artikal ide na početnu stranicu weba.',
          'Artikle za web uređuju svi zaposleni osim dostave; svaka izmjena se vidi u Dnevniku izmjena.',
          'Promjene se na webu vide nakon ponovne izgradnje stranice (nekoliko minuta).',
        ],
      },
      {
        h: 'Tekstovi na webu',
        items: [
          'Kartica „Tekstovi na webu”: lijevo odaberete dio stranice (Naslovnica, Obavijest na vrhu, O nama, Kontakt i radno vrijeme), desno mijenjate tekst.',
          'Ispod svakog polja piše gdje se tekst vidi na webu. Brojač pokazuje koliko je znakova dozvoljeno; preko granice se ne može spremiti.',
          'Za Naslovnicu i Obavijest gore je umanjeni prikaz — odmah vidite kako izgleda dok kucate.',
          'Ništa nije na webu dok ne kliknete „Spremi i objavi”. Nakon toga web se osvježi za nekoliko minuta.',
          '„Vrati izvorni tekst” vraća tekst koji je web imao na početku. Svaka izmjena se upisuje u Dnevnik izmjena (ko, kada, šta).',
          'Obavijest na vrhu: upišite tekst (npr. „Black Friday: −20 % na garniture do nedjelje”), po želji link (npr. /akcije/) i datum do kada se prikazuje — nakon tog dana nestane sama.',
          'Kontakt i radno vrijeme mijenja samo voditelj salona, uprava ili admin; ostali ga vide zaključano.',
          'Velika fotografija naslovnice sprema se odmah po odabiru. Najbolje vodoravna, svijetla fotografija salona, bez teksta na slici.',
        ],
      },
    ],
  },
  {
    id: 'web-clanci',
    route: '/web',
    title: 'Članci na webu',
    purpose: 'Savjeti za kupce u „Inspiracija i savjeti” — dovode kupce s Googlea.',
    fields: [
      'Naslov (kako bi kupac pitao Google), tema, kratki opis do 160 znakova, naslovna fotografija, tekst od barem 120 riječi.',
      'Trgovac: „Spremi nacrt” ili „Pošalji na odobrenje”. Voditelj, uprava, admin: „Objavi na webu”.',
    ],
    details: [
      {
        h: 'Kako napisati članak',
        items: [
          'Klik „Novi članak”, upišite naslov, npr. „Kako odabrati madrac za bolna leđa” — onako kako bi kupac pitao Google.',
          '„AI napiše prijedlog” napiše tekst prema naslovu za 10–30 sekundi. Obavezno ga pročitajte i popravite: AI ne zna naše cijene, akcije ni rokove i ne smije ih obećavati.',
          'Pišete normalno: prazan red = novi odlomak. Gumbi iznad teksta dodaju podnaslov, nabrajanje, podebljani tekst ili link na stranicu weba (npr. /kontakt/).',
          '„Pregled” pokazuje kako će članak izgledati na webu.',
          'Desno je popis „Prije objave” — kad su sve kvačice zelene, članak se može poslati.',
        ],
      },
      {
        h: 'Odobrenje i objava',
        items: [
          'Trgovac članak šalje na odobrenje; voditelj salona, uprava i admin dobiju obavijest u zvoncu.',
          'Voditelj članak pročita, po potrebi popravi i klikne „Objavi na webu”. Web se osvježi za nekoliko minuta.',
          'Objavljeni članak mijenja ili skida s weba samo voditelj, uprava ili admin („Skloni s weba” vraća ga u nacrt).',
          'Adresa objavljenog članka se ne mijenja ni kad se promijeni naslov, da linkovi iz Googlea ne puknu.',
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
          'Mjesto prijema: salon (odmah se može prodavati) ili skladište. Prodaja se uvijek skida iz salona, pa robu iz skladišta prvo premjestite u salon.',
          'Interna primka (premještaj skladište → salon i obrnuto) bilježi tok robe. Gumb je na stranici Primke. Svaki premještaj ostaje u dnevniku.',
          'Inventura se radi odvojeno za salon i skladište (birate na vrhu stranice Inventura).',
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
          'Stavke koje nisu u šifrarniku možete odmah dodati u šifrarnik (gumb „Dodaj u šifrarnik”). Šifra, naziv i nabavna cijena se predpopune; unesete prodajnu cijenu i stavka ulazi u primku.',
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
      'Naziv, šifra, kategorija (bira se s popisa; popis kategorija uređuju uprava i admin gumbom „Kategorije”), opis i dimenzije.',
      'Interna šifra ide redom (ART-0001, ART-0002 …). Novi artikal dobije prvi slobodan broj: kad se artikal arhivira, njegov broj se oslobodi i popuni ga sljedeći novi artikal.',
      'Šifra u fiskalnom programu je posebno polje: pokazuje koji je to artikal u knjigovodstvu i ne mijenja se s internom šifrom. Pretraga traži i po njoj.',
      'Prodajna cijena (s PDV-om) i nabavna cijena.',
      'Dobavljač, minimalna zaliha, slika.',
    ],
    details: [
      {
        h: 'Savjeti',
        items: [
          'Minimalna zaliha pokreće upozorenje na Pregledu i Zalihama.',
          'Popisi artikala (Artikli, Zalihe, Inventura, Katalog, Naljepnice) prikazuju po 50 artikala; stranice se biraju brojevima ispod popisa. Lista za brojanje u Inventuri ispisuje sve filtrirane artikle.',
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
