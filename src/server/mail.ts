/** Slanje e-pošte preko Resenda (HTTPS API). Domena ardornamjestaj.com je potvrđena u Resendu. */
export const mailReady = () => !!process.env.RESEND_API_KEY

export async function sendMail(m: { from: string; to: string[]; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('E-pošta nije podešena: na serveru nedostaje RESEND_API_KEY.')
  // RESEND_API_URL služi samo za lokalno testiranje (lažni server); na Renderu se ne postavlja.
  const res = await fetch(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(m),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend je odbio poruku (${res.status}). ${body.slice(0, 200)}`)
  }
}
