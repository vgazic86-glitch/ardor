/* ARDOR — servisni radnik: omogućava instalaciju aplikacije. Podaci se uvijek čitaju s mreže (bez keširanja). */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(
    fetch(e.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARDOR</title><body style="font-family:Ubuntu,sans-serif;background:#2B211B;color:#F7F1EA;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1 style="color:#F79328">Nema interneta</h1><p>ARDOR aplikacija treba vezu s internetom. Provjerite Wi-Fi ili mobilne podatke pa pokušajte ponovo.</p></div>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
    ),
  )
})
