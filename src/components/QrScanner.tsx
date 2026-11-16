import { useNavigate } from '@tanstack/react-router'
import { Camera, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/** Skeniranje QR naljepnice kamerom: otvara karticu artikla na Zalihama. */
export function QrScanner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const [msg, setMsg] = useState('Usmjerite kameru na QR kod naljepnice.')
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let alive = true
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
    if (!BD || !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true)
      return
    }
    const detector = new BD({ formats: ['qr_code'] })
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!alive || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = async () => {
          if (!alive || !video.current) return
          try {
            const codes = await detector.detect(video.current)
            const raw = codes[0]?.rawValue
            if (raw) {
              const m = raw.match(/[?&]artikal=(\d+)/)
              if (m) {
                onClose()
                navigate({ to: '/zalihe', search: { artikal: m[1] } })
                return
              }
              setMsg('Ovo nije ARDOR naljepnica artikla.')
            }
          } catch {
            /* sljedeći pokušaj */
          }
          timer = setTimeout(tick, 250)
        }
        tick()
      } catch {
        setMsg('Kamera nije dostupna — dozvolite pristup kameri u pregledniku.')
      }
    })()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [navigate, onClose])

  return (
    <Modal title="Skeniraj naljepnicu" subtitle="Otvara karticu artikla sa stanjem i rezervacijama." onClose={onClose} help={false}>
      {unsupported ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-walnut-700">
          <Camera className="size-10 text-copper-500" />
          <p>
            Ovaj preglednik ne podržava skeniranje unutar aplikacije (npr. iPhone).
            <br />
            Otvorite <strong>kameru telefona</strong> i usmjerite je na QR kod — kartica artikla otvori se sama.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
            <ScanLine className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 text-white/70" />
          </div>
          <p className="text-center text-sm text-walnut-600">{msg}</p>
        </div>
      )}
    </Modal>
  )
}
