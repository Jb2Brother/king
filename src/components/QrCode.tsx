import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrCode({ text, size = 180 }: { text: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: '#060b16', light: '#ffffff' } })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc('') })
    return () => { alive = false }
  }, [text, size])
  if (!src) return <div className="qr-empty">Generando QR…</div>
  return (
    <div className="qr-wrap">
      <img src={src} alt="Código QR" width={size} height={size} />
      <a className="btn btn-ghost btn-sm" href={src} download="barberlink-qr.png">Descargar PNG</a>
    </div>
  )
}

/** Generador libre de QR para cualquier texto o enlace. */
export function QrGenerator() {
  const [text, setText] = useState('https://instagram.com/barberlink')
  return (
    <div className="card">
      <h3>Generador libre de QR</h3>
      <p className="muted">Escribe cualquier texto o enlace y descarga su QR.</p>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://…" />
      {text.trim() ? <QrCode text={text.trim()} /> : <p className="muted">Escribe algo para generar el QR.</p>}
    </div>
  )
}
