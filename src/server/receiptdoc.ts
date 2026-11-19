import { db } from '../../db/index.js'
import * as t from '../../db/schema.js'
import { matchProduct, matchSupplier, parseDocJson } from '../lib/receiptdoc'

/**
 * Čita dokument dobavljača (PDF ili slika) i predlaže stavke za primku.
 * Ništa se ne sprema: korisnik pregledava i potvrđuje primku. Šalje se samo dokument dobavljača
 * (bez podataka o kupcima i zaposlenicima).
 */

const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 4 * 1024 * 1024
const GEMINI_URL = () => process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

const PROMPT = `Iz priloženog dokumenta dobavljača (račun, otpremnica ili ponuda) izvuci podatke za prijem robe.
Vrati SAMO JSON u obliku:
{"dobavljac":"naziv dobavljača","brojDokumenta":"broj računa ili otpremnice","datum":"YYYY-MM-DD","stavke":[{"sifra":"šifra artikla ili prazno","naziv":"naziv artikla","kolicina":broj,"cijena":broj}]}
Pravila: "kolicina" je broj komada. "cijena" je cijena po jedinici BEZ PDV-a, decimalni broj s tačkom (npr. 450.00). Ako dokument nema cijene, stavi 0. Ne izmišljaj stavke koje nisu na dokumentu. Ne dodaj tekst prije ni poslije JSON-a.`

export interface ReadDocInput {
  name: string
  mime: string
  dataB64: string
}

export async function readSupplierDoc(input: ReadDocInput) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Čitanje dokumenta nije uključeno. Administrator treba postaviti GEMINI_API_KEY na Renderu. Primku možete unijeti ručno.')
  if (!MIMES.includes(input.mime)) throw new Error('Dokument mora biti PDF ili slika (JPG, PNG, WEBP).')
  if (Buffer.byteLength(input.dataB64, 'base64') > MAX_BYTES) throw new Error('Dokument može biti najviše 4 MB.')

  const res = await fetch(`${GEMINI_URL()}/v1beta/models/${encodeURIComponent(GEMINI_MODEL())}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: input.mime, data: input.dataB64 } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 4096 },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) {
    console.error('Primka: greška Gemini API-ja', res.status, (await res.text()).slice(0, 300))
    if (res.status === 429) throw new Error('Dnevna kvota za čitanje dokumenata je potrošena. Pokušajte sutra ili unesite primku ručno.')
    if (res.status === 400 || res.status === 401 || res.status === 403)
      throw new Error('AI ključ nije prihvaćen. Administrator treba provjeriti GEMINI_API_KEY na Renderu.')
    throw new Error('Čitanje dokumenta trenutno nije dostupno. Pokušajte ponovo ili unesite primku ručno.')
  }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  const doc = parseDocJson(text)

  const [products, suppliers] = await Promise.all([
    db.select({ id: t.products.id, sku: t.products.sku, name: t.products.name }).from(t.products),
    db.select({ id: t.suppliers.id, name: t.suppliers.name }).from(t.suppliers),
  ])
  const pid = (p: { id: number }) => String(p.id)
  const productList = products.map((p) => ({ id: pid(p), sku: p.sku, name: p.name }))
  return {
    supplierId: matchSupplier(doc.dobavljac, suppliers.map((s) => ({ id: pid(s), name: s.name }))),
    supplierName: doc.dobavljac,
    documentNumber: doc.brojDokumenta,
    date: doc.datum,
    lines: doc.stavke.map((l) => ({
      productId: matchProduct(l, productList),
      sifra: l.sifra,
      naziv: l.naziv,
      qty: l.kolicina,
      unitCost: l.cijena,
    })),
  }
}
